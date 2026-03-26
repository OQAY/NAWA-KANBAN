import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

const MEMORY_PREFIX = 'ai:chat:';
const MEMORY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_MESSAGES = 100; // 50 exchanges (user+ai)

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 30_000; // 30s before trying again
const OPERATION_TIMEOUT_MS = 3_000; // 3s max per Redis operation

interface StoredMessage {
  role: 'human' | 'ai' | 'system';
  content: string;
}

@Injectable()
export class AiMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiMemoryService.name);
  private redis: Redis | null = null;
  private isReady = false;

  // Circuit breaker state
  private failures = 0;
  private circuitOpenUntil = 0;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get('REDIS_HOST', 'redis');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      this.redis = new Redis({
        host,
        port,
        retryStrategy: (times) => Math.min(times * 200, 2000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isReady = false;
      });

      this.redis.on('ready', () => {
        this.logger.log('Redis memory connected and ready');
        this.isReady = true;
        this.failures = 0;
      });

      this.redis.on('close', () => {
        this.isReady = false;
      });

      this.redis.connect().catch((err) => {
        this.logger.warn(`Redis initial connection failed: ${err.message} — AI memory will work without persistence`);
      });
    } catch (err) {
      this.logger.warn(`Redis init failed: ${err.message} — AI memory disabled`);
    }
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  private isCircuitOpen(): boolean {
    if (this.failures < CIRCUIT_BREAKER_THRESHOLD) return false;
    if (Date.now() > this.circuitOpenUntil) {
      // Half-open: allow one try
      this.failures = CIRCUIT_BREAKER_THRESHOLD - 1;
      return false;
    }
    return true;
  }

  private recordFailure(): void {
    this.failures++;
    if (this.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      this.logger.warn(`Redis circuit breaker OPEN — skipping Redis for ${CIRCUIT_BREAKER_RESET_MS / 1000}s`);
    }
  }

  private recordSuccess(): void {
    this.failures = 0;
  }

  private async withTimeout<T>(operation: Promise<T>, fallback: T): Promise<T> {
    if (!this.redis || !this.isReady || this.isCircuitOpen()) {
      return fallback;
    }

    try {
      const result = await Promise.race([
        operation,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Redis operation timeout')), OPERATION_TIMEOUT_MS),
        ),
      ]);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Redis operation failed: ${error.message}`);
      return fallback;
    }
  }

  private key(userId: string): string {
    return `${MEMORY_PREFIX}${userId}`;
  }

  async getHistory(userId: string): Promise<BaseMessage[]> {
    const stored = await this.withTimeout(
      this.loadMessages(userId),
      [] as StoredMessage[],
    );

    if (stored.length === 0) return [];

    return stored.map((m) => {
      switch (m.role) {
        case 'human': return new HumanMessage(m.content);
        case 'ai': return new AIMessage(m.content);
        case 'system': return new SystemMessage(m.content);
        default: return new HumanMessage(m.content);
      }
    });
  }

  async addMessages(userId: string, messages: BaseMessage[]): Promise<void> {
    if (!this.redis || !this.isReady || this.isCircuitOpen()) return;

    const existing = await this.withTimeout(
      this.loadMessages(userId),
      [] as StoredMessage[],
    );

    for (const msg of messages) {
      const role = this.getRole(msg);
      existing.push({
        role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      });
    }

    const trimmed = existing.length > MAX_MESSAGES
      ? existing.slice(-MAX_MESSAGES)
      : existing;

    await this.withTimeout(
      this.redis!.setex(this.key(userId), MEMORY_TTL_SECONDS, JSON.stringify(trimmed)),
      'OK',
    );
  }

  async clearHistory(userId: string): Promise<void> {
    if (!this.redis || !this.isReady || this.isCircuitOpen()) return;
    await this.withTimeout(this.redis.del(this.key(userId)), 0);
  }

  private async loadMessages(userId: string): Promise<StoredMessage[]> {
    if (!this.redis) return [];
    try {
      const raw = await this.redis.get(this.key(userId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private getRole(msg: BaseMessage): 'human' | 'ai' | 'system' {
    const type = msg._getType();
    if (type === 'human') return 'human';
    if (type === 'ai') return 'ai';
    if (type === 'system') return 'system';
    return 'human';
  }
}
