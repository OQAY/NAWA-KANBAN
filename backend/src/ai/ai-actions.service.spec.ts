import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiActionsService } from './ai-actions.service';
import { TasksService } from '../tasks/tasks.service';
import { ColumnsService } from '../columns/columns.service';
import { AiContextService } from './ai-context.service';
import { Task } from '../database/entities/task.entity';
import { AiAction } from './dto/ai-response.dto';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'developer',
};

describe('AiActionsService', () => {
  let service: AiActionsService;
  let tasksService: jest.Mocked<Partial<TasksService>>;
  let aiContextService: jest.Mocked<Partial<AiContextService>>;
  let taskRepository: any;

  beforeEach(async () => {
    tasksService = {
      create: jest.fn().mockResolvedValue({ id: 'new-task', title: 'Test Task' }),
      update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'done' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    aiContextService = {
      getProjectId: jest.fn().mockResolvedValue('project-1'),
    };

    taskRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'task-1', projectId: 'project-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiActionsService,
        { provide: TasksService, useValue: tasksService },
        { provide: ColumnsService, useValue: {} },
        { provide: AiContextService, useValue: aiContextService },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
      ],
    }).compile();

    service = module.get<AiActionsService>(AiActionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeActions', () => {
    it('should execute create_task action', async () => {
      const actions: AiAction[] = [
        {
          action: 'create_task',
          params: { title: 'New Task', status: 'pending', priority: 2 },
        },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(tasksService.create).toHaveBeenCalled();
    });

    it('should execute move_task action', async () => {
      const actions: AiAction[] = [
        {
          action: 'move_task',
          params: { taskId: 'task-1', status: 'done' },
        },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        { status: 'done' },
        mockUser,
      );
    });

    // F17: Test for update_task action
    it('should execute update_task action', async () => {
      const actions: AiAction[] = [
        {
          action: 'update_task',
          params: { taskId: 'task-1', title: 'Updated Title', priority: 3 },
        },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        { title: 'Updated Title', priority: 3 },
        mockUser,
      );
    });

    it('should fail update_task without taskId', async () => {
      const actions: AiAction[] = [
        { action: 'update_task', params: { title: 'No ID' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('taskId is required');
    });

    it('should execute delete_task action', async () => {
      const actions: AiAction[] = [
        { action: 'delete_task', params: { taskId: 'task-1' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(tasksService.remove).toHaveBeenCalledWith('task-1', mockUser);
    });

    it('should handle action errors gracefully', async () => {
      tasksService.create!.mockRejectedValueOnce(new Error('DB error'));

      const actions: AiAction[] = [
        {
          action: 'create_task',
          params: { title: 'Fail Task', status: 'pending' },
        },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('DB error');
    });

    it('should execute multiple actions in sequence', async () => {
      const actions: AiAction[] = [
        { action: 'create_task', params: { title: 'Task A', status: 'pending' } },
        { action: 'move_task', params: { taskId: 'task-1', status: 'done' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should fail move_task without taskId', async () => {
      const actions: AiAction[] = [
        { action: 'move_task', params: { status: 'done' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('taskId is required');
    });

    // F3: Test project-scope validation
    it('should reject action on task from different project', async () => {
      taskRepository.findOne.mockResolvedValueOnce({ id: 'task-x', projectId: 'other-project' });

      const actions: AiAction[] = [
        { action: 'move_task', params: { taskId: 'task-x', status: 'done' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('does not belong');
    });

    // F11: Test param validation
    it('should reject create_task with non-string title', async () => {
      const actions: AiAction[] = [
        { action: 'create_task', params: { title: 123, status: 'pending' } },
      ];

      const results = await service.executeActions(actions, mockUser as any);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('title is required');
    });
  });
});
