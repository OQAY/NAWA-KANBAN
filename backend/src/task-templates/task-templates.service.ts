import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskTemplate } from '../database/entities/task-template.entity';

@Injectable()
export class TaskTemplatesService {
  constructor(
    @InjectRepository(TaskTemplate)
    private templateRepository: Repository<TaskTemplate>,
  ) {}

  async findByProject(projectId: string, userId: string): Promise<TaskTemplate[]> {
    return this.templateRepository.find({
      where: [
        { projectId, userId },
        { projectId: null as unknown as string, userId },
      ],
      order: { name: 'ASC' },
    });
  }

  async create(name: string, data: Record<string, unknown>, userId: string, projectId?: string): Promise<TaskTemplate> {
    const template = this.templateRepository.create({ name, data, userId, projectId });
    return this.templateRepository.save(template);
  }

  async remove(id: string, userId: string): Promise<void> {
    const template = await this.templateRepository.findOne({ where: { id, userId } });
    if (!template) throw new NotFoundException('Template not found');
    await this.templateRepository.remove(template);
  }
}
