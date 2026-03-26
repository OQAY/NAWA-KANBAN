import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import { ColumnsService } from '../columns/columns.service';
import { Task } from '../database/entities/task.entity';
import { User } from '../database/entities/user.entity';
import { AiAction, ExecutedAction } from './dto/ai-response.dto';
import { AiContextService } from './ai-context.service';

const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;

@Injectable()
export class AiActionsService {
  private readonly logger = new Logger(AiActionsService.name);

  constructor(
    private tasksService: TasksService,
    private columnsService: ColumnsService,
    private aiContextService: AiContextService,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async executeActions(
    actions: AiAction[],
    user: User,
    projectId?: string,
  ): Promise<ExecutedAction[]> {
    const results: ExecutedAction[] = [];
    const resolvedProjectId = await this.aiContextService.getProjectId(user, projectId);

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, user, resolvedProjectId);
        results.push({ action: action.action, success: true, result });
      } catch (error) {
        this.logger.error(`Action ${action.action} failed: ${error.message}`);
        results.push({
          action: action.action,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async executeAction(
    action: AiAction,
    user: User,
    projectId: string | null,
  ): Promise<any> {
    // F11: Validate action type
    const validActions = ['create_task', 'move_task', 'update_task', 'delete_task'];
    if (!validActions.includes(action.action)) {
      throw new Error(`Unknown action: ${action.action}`);
    }

    switch (action.action) {
      case 'create_task':
        return this.createTask(action.params, user, projectId);
      case 'move_task':
        return this.moveTask(action.params, user, projectId);
      case 'update_task':
        return this.updateTask(action.params, user, projectId);
      case 'delete_task':
        return this.deleteTask(action.params, user, projectId);
    }
  }

  // F3: Verify task belongs to the active project
  private async verifyTaskProject(taskId: string, projectId: string | null): Promise<void> {
    if (!projectId) return;

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: ['id', 'projectId'],
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.projectId !== projectId) {
      throw new Error('Task does not belong to the current project');
    }
  }

  private async createTask(
    params: Record<string, any>,
    user: User,
    projectId: string | null,
  ) {
    // F11: Validate params
    if (!params.title || typeof params.title !== 'string') {
      throw new Error('title is required and must be a string');
    }

    const title = params.title.slice(0, MAX_TITLE_LENGTH);
    const description = typeof params.description === 'string'
      ? params.description.slice(0, MAX_DESCRIPTION_LENGTH)
      : '';
    const priority = typeof params.priority === 'number' && params.priority >= 0 && params.priority <= 3
      ? params.priority
      : 0;

    const createDto = {
      title,
      description,
      status: typeof params.status === 'string' ? params.status : 'pending',
      priority,
      projectId: projectId || params.projectId,
    };

    if (!createDto.projectId) {
      throw new Error('No project available to create task in');
    }

    return this.tasksService.create(createDto as any, user);
  }

  private async moveTask(params: Record<string, any>, user: User, projectId: string | null) {
    if (!params.taskId || typeof params.taskId !== 'string') {
      throw new Error('taskId is required for move_task');
    }

    // F3: Verify task belongs to project
    await this.verifyTaskProject(params.taskId, projectId);

    return this.tasksService.update(
      params.taskId,
      { status: params.status } as any,
      user,
    );
  }

  private async updateTask(params: Record<string, any>, user: User, projectId: string | null) {
    if (!params.taskId || typeof params.taskId !== 'string') {
      throw new Error('taskId is required for update_task');
    }

    // F3: Verify task belongs to project
    await this.verifyTaskProject(params.taskId, projectId);

    const updateDto: Record<string, any> = {};
    if (typeof params.title === 'string') updateDto.title = params.title.slice(0, MAX_TITLE_LENGTH);
    if (typeof params.description === 'string') updateDto.description = params.description.slice(0, MAX_DESCRIPTION_LENGTH);
    if (typeof params.priority === 'number' && params.priority >= 0 && params.priority <= 3) {
      updateDto.priority = params.priority;
    }

    return this.tasksService.update(params.taskId, updateDto as any, user);
  }

  private async deleteTask(params: Record<string, any>, user: User, projectId: string | null) {
    if (!params.taskId || typeof params.taskId !== 'string') {
      throw new Error('taskId is required for delete_task');
    }

    // F3: Verify task belongs to project
    await this.verifyTaskProject(params.taskId, projectId);

    await this.tasksService.remove(params.taskId, user);
    return { deleted: true, taskId: params.taskId };
  }
}
