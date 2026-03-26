import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

const MEMORY_PREFIX = 'ai:chat:';
const MEMORY_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_MESSAGES = 40; // 20 exchanges (user+ai)

interface StoredMessage {
  role: 'human' | 'ai' | 'system';
  content: string;
}

@Injectable()
export class AiMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiMemoryService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get('REDIS_HOST', 'redis');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redis = new Redis({
      host,
      port,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis memory connected');
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  private key(userId: string): string {
    return `${MEMORY_PREFIX}${userId}`;
  }

  async getHistory(userId: string): Promise<BaseMessage[]> {
    try {
      const stored = await this.loadMessages(userId);
      if (stored.length === 0) return [];

      return stored.map((m) => {
        switch (m.role) {
          case 'human': return new HumanMessage(m.content);
          case 'ai': return new AIMessage(m.content);
          case 'system': return new SystemMessage(m.content);
          default: return new HumanMessage(m.content);
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get history for ${userId}: ${error.message}`);
      return [];
    }
  }

  async addMessages(userId: string, messages: BaseMessage[]): Promise<void> {
    try {
      const existing = await this.loadMessages(userId);

      for (const msg of messages) {
        const role = this.getRole(msg);
        existing.push({
          role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        });
      }

      // Cap history to prevent unbounded growth
      const trimmed = existing.length > MAX_MESSAGES
        ? existing.slice(-MAX_MESSAGES)
        : existing;

      await this.redis.setex(
        this.key(userId),
        MEMORY_TTL_SECONDS,
        JSON.stringify(trimmed),
      );
    } catch (error) {
      this.logger.error(`Failed to save messages for ${userId}: ${error.message}`);
    }
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      await this.redis.del(this.key(userId));
    } catch (error) {
      this.logger.error(`Failed to clear history for ${userId}: ${error.message}`);
    }
  }

  private async loadMessages(userId: string): Promise<StoredMessage[]> {
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
