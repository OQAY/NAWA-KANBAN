import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities/task.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async getProjectAnalytics(projectId: string) {
    // Tasks by status
    const byStatus = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.parent_id IS NULL') // exclude subtasks
      .groupBy('task.status')
      .getRawMany();

    // Tasks by priority
    const byPriority = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.parent_id IS NULL')
      .groupBy('task.priority')
      .getRawMany();

    // Tasks by assignee
    const byAssignee = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignee', 'user')
      .select('user.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.parent_id IS NULL')
      .andWhere('task.assignee_id IS NOT NULL')
      .groupBy('user.name')
      .getRawMany();

    // Completed by week (last 8 weeks)
    const byWeek = await this.taskRepository
      .createQueryBuilder('task')
      .select("DATE_TRUNC('week', task.completed_at)", 'week')
      .addSelect('COUNT(*)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.completed_at IS NOT NULL')
      .andWhere("task.completed_at > NOW() - INTERVAL '8 weeks'")
      .groupBy("DATE_TRUNC('week', task.completed_at)")
      .orderBy('week', 'ASC')
      .getRawMany();

    // Summary counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

    const totalOpen = await this.taskRepository.count({
      where: { projectId },
    });

    const totalOverdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.due_date < :today', { today })
      .andWhere("task.status != 'done'")
      .andWhere('task.parent_id IS NULL')
      .getCount();

    return {
      byStatus,
      byPriority,
      byAssignee,
      byWeek,
      summary: {
        totalOpen,
        totalOverdue,
      },
    };
  }
}
