import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { Project } from '../database/entities/project.entity';
import { User } from '../database/entities/user.entity';

export interface SearchResult {
  type: 'task' | 'project';
  id: string;
  title: string;
  projectName?: string;
  projectId?: string;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async search(query: string, user: User): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const results: SearchResult[] = [];

    // Search tasks
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('(task.title ILIKE :q OR task.description ILIKE :q)', { q: `%${query}%` })
      .andWhere('task.createdById = :userId', { userId: user.id })
      .take(10)
      .getMany();

    for (const task of tasks) {
      results.push({
        type: 'task',
        id: task.id,
        title: task.title,
        projectName: task.project?.name,
        projectId: task.projectId,
      });
    }

    // Search projects
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.name ILIKE :q', { q: `%${query}%` })
      .andWhere('project.ownerId = :userId', { userId: user.id })
      .take(5)
      .getMany();

    for (const project of projects) {
      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
      });
    }

    return results;
  }
}
