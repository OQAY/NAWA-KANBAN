import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification, NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async findByUser(userId: string, limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    entityId?: string,
    entityType?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId, type, title, body, entityId, entityType,
    });
    return this.notificationRepository.save(notification);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (notification) {
      notification.read = true;
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true })
      .where('user_id = :userId', { userId })
      .andWhere('read = false')
      .execute();
  }

  @OnEvent('task.assigned')
  async handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string; assignedByName: string }) {
    await this.create(
      payload.assigneeId,
      'task_assigned',
      `${payload.assignedByName} atribuiu uma tarefa a você`,
      payload.taskTitle,
      payload.taskId,
      'task',
    );
  }

  @OnEvent('comment.created')
  async handleCommentCreated(payload: { taskId: string; taskTitle: string; taskCreatedById: string; commentUserName: string; commentUserId: string }) {
    // Don't notify if the commenter is the task creator
    if (payload.commentUserId === payload.taskCreatedById) return;
    await this.create(
      payload.taskCreatedById,
      'task_commented',
      `${payload.commentUserName} comentou na tarefa`,
      payload.taskTitle,
      payload.taskId,
      'task',
    );
  }

  @OnEvent('member.added')
  async handleMemberAdded(payload: { projectId: string; projectName: string; userId: string }) {
    await this.create(
      payload.userId,
      'member_added',
      `Você foi adicionado ao projeto`,
      payload.projectName,
      payload.projectId,
      'project',
    );
  }
}
