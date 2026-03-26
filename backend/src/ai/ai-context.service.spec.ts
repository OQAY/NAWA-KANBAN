import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiContextService } from './ai-context.service';
import { Task } from '../database/entities/task.entity';
import { KanbanColumn } from '../database/entities/column.entity';
import { Project } from '../database/entities/project.entity';
import { ProjectMember } from '../database/entities/project-member.entity';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'developer',
};

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  ownerId: 'user-1',
};

const mockColumns = [
  { id: 'col-1', name: 'Pendente', status: 'pending', order: 0, userId: 'user-1' },
  { id: 'col-2', name: 'Em Progresso', status: 'in_progress', order: 1, userId: 'user-1' },
  { id: 'col-3', name: 'Concluído', status: 'done', order: 2, userId: 'user-1' },
];

const mockTasks = [
  { id: 'task-1', title: 'Task 1', status: 'pending', priority: 2, position: 0, assignee: { name: 'Dev' }, dueDate: null },
  { id: 'task-2', title: 'Task 2', status: 'in_progress', priority: 3, position: 0, assignee: null, dueDate: new Date('2026-04-01') },
];

describe('AiContextService', () => {
  let service: AiContextService;

  const mockColumnRepo = {
    find: jest.fn().mockResolvedValue(mockColumns),
  };

  const mockProjectRepo = {
    findOne: jest.fn().mockResolvedValue(mockProject),
  };

  const mockTaskRepo = {
    find: jest.fn().mockResolvedValue(mockTasks),
  };

  const mockMemberRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiContextService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepo },
        { provide: getRepositoryToken(KanbanColumn), useValue: mockColumnRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(ProjectMember), useValue: mockMemberRepo },
      ],
    }).compile();

    service = module.get<AiContextService>(AiContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildContext', () => {
    it('should build context string with board data', async () => {
      const context = await service.buildContext(mockUser as any, 'project-1');

      expect(context).toContain('Test Project');
      expect(context).toContain('Pendente');
      expect(context).toContain('Em Progresso');
      expect(context).toContain('Task 1');
      expect(context).toContain('Task 2');
      expect(context).toContain('Test User');
    });

    it('should return empty context message when no project found', async () => {
      mockProjectRepo.findOne.mockResolvedValueOnce(null);

      const context = await service.buildContext(mockUser as any);
      expect(context).toContain('Nenhum projeto encontrado');
    });

    it('should count tasks per column correctly', async () => {
      const context = await service.buildContext(mockUser as any, 'project-1');

      expect(context).toContain('Pendente (status: "pending") — 1 tasks');
      expect(context).toContain('Em Progresso (status: "in_progress") — 1 tasks');
      expect(context).toContain('Concluído (status: "done") — 0 tasks');
    });
  });

  describe('getProjectId', () => {
    it('should return provided projectId', async () => {
      const result = await service.getProjectId(mockUser as any, 'project-1');
      expect(result).toBe('project-1');
    });

    it('should find user project when no projectId provided', async () => {
      const result = await service.getProjectId(mockUser as any);
      expect(result).toBe('project-1');
    });

    it('should return null when no project found', async () => {
      mockProjectRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.getProjectId(mockUser as any);
      expect(result).toBeNull();
    });
  });
});
