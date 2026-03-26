import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from '../database/entities/activity-log.entity';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(
    userId: string,
    action: string,
    entityId: string,
    entityType: string,
    changes?: Record<string, unknown>,
  ): Promise<ActivityLog> {
    const entry = this.activityLogRepository.create({
      userId, action, entityId, entityType, changes,
    });
    return this.activityLogRepository.save(entry);
  }

  async findByEntity(entityId: string, entityType: string, limit = 20): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      where: { entityId, entityType },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @OnEvent('task.created')
  async handleTaskCreated(payload: { taskId: string; userId: string; title: string }) {
    await this.log(payload.userId, 'created', payload.taskId, 'task', { title: payload.title });
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(payload: { taskId: string; userId: string; changes: Record<string, unknown> }) {
    await this.log(payload.userId, 'updated', payload.taskId, 'task', payload.changes);
  }

  @OnEvent('task.assigned')
  async handleTaskAssigned(payload: { taskId: string; assigneeId: string; assignedByName: string }) {
    await this.log(payload.assigneeId, 'assigned', payload.taskId, 'task', { assignedBy: payload.assignedByName });
  }

  @OnEvent('comment.created')
  async handleCommentCreated(payload: { taskId: string; commentUserId: string; commentUserName: string }) {
    await this.log(payload.commentUserId, 'commented', payload.taskId, 'task', { by: payload.commentUserName });
  }
}
