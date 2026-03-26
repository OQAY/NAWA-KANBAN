import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { Project } from '../database/entities/project.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiProactiveService {
  private readonly logger = new Logger(AiProactiveService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 9 * * *') // Every day at 9:00 AM
  async dailyCheck() {
    this.logger.log('Running daily AI proactive check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find overdue tasks
    const overdueTasks = await this.taskRepository.find({
      where: {
        dueDate: LessThan(today),
        status: Not('done'),
        parentId: undefined,
      },
      relations: ['project'],
    });

    // Group by project owner and notify
    const byOwner = new Map<string, Task[]>();
    for (const task of overdueTasks) {
      if (!task.project) continue;
      const ownerId = task.project.ownerId;
      if (!byOwner.has(ownerId)) byOwner.set(ownerId, []);
      byOwner.get(ownerId)!.push(task);
    }

    for (const [ownerId, tasks] of byOwner) {
      const count = tasks.length;
      const taskNames = tasks.slice(0, 3).map(t => t.title).join(', ');
      const title = `Você tem ${count} task${count > 1 ? 's' : ''} atrasada${count > 1 ? 's' : ''}`;
      const body = count <= 3 ? taskNames : `${taskNames} e mais ${count - 3}`;

      await this.notificationsService.create(
        ownerId,
        'due_date_warning',
        title,
        body,
        tasks[0].projectId,
        'project',
      );
    }

    this.logger.log(`Daily check complete: ${overdueTasks.length} overdue tasks found, ${byOwner.size} users notified`);
  }
}
