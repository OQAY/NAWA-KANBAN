import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUserMemory } from '../database/entities/ai-user-memory.entity';

@Injectable()
export class AiLongMemoryService {
  private readonly logger = new Logger(AiLongMemoryService.name);

  constructor(
    @InjectRepository(AiUserMemory)
    private memoryRepository: Repository<AiUserMemory>,
  ) {}

  /**
   * Store or update a memory for a user.
   * If the key already exists, updates the value.
   */
  async remember(
    userId: string,
    key: string,
    value: string,
    category: string = 'preference',
  ): Promise<AiUserMemory> {
    const existing = await this.memoryRepository.findOne({
      where: { userId, key },
    });

    if (existing) {
      existing.value = value;
      existing.category = category;
      return this.memoryRepository.save(existing);
    }

    return this.memoryRepository.save(
      this.memoryRepository.create({ userId, key, value, category }),
    );
  }

  /**
   * Recall a specific memory by key.
   */
  async recall(userId: string, key: string): Promise<string | null> {
    const memory = await this.memoryRepository.findOne({
      where: { userId, key },
    });
    return memory?.value ?? null;
  }

  /**
   * Get all memories for a user, optionally filtered by category.
   */
  async getAllMemories(
    userId: string,
    category?: string,
  ): Promise<AiUserMemory[]> {
    const where: any = { userId };
    if (category) where.category = category;
    return this.memoryRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Forget (delete) a specific memory.
   */
  async forget(userId: string, key: string): Promise<boolean> {
    const result = await this.memoryRepository.delete({ userId, key });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Build a context string from all user memories to inject into the AI prompt.
   * Returns empty string if user has no memories.
   */
  async buildMemoryContext(userId: string): Promise<string> {
    const memories = await this.getAllMemories(userId);
    if (!memories.length) return '';

    const grouped: Record<string, AiUserMemory[]> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    }

    const categoryLabels: Record<string, string> = {
      preference: 'Preferências do Usuário',
      fact: 'Fatos Importantes',
      instruction: 'Instruções do Usuário',
      context: 'Contexto Geral',
    };

    let context = '## Memória de Longo Prazo\n';
    for (const [cat, items] of Object.entries(grouped)) {
      context += `### ${categoryLabels[cat] || cat}\n`;
      context += items.map((m) => `- **${m.key}**: ${m.value}`).join('\n');
      context += '\n';
    }

    return context;
  }
}
