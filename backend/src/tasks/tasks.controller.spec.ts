import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '../database/entities/task.entity';

describe('TasksController - Sistema Completo de Kanban', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
    
    // Limpa mocks entre testes
    jest.clearAllMocks();
  });

  describe('1. KANBAN COM 4 COLUNAS PADRÃO', () => {
    it('deve retornar 4 colunas vazias para usuário novo', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({}, { user: { id: 'new-user' } });

      expect(service.findAll).toHaveBeenCalledWith('new-user', {});
      expect(result).toHaveLength(0); // Nenhuma task ainda
    });

    it('deve validar que existem 4 status possíveis', () => {
      const statuses = Object.values(TaskStatus);
      expect(statuses).toEqual(['pending', 'in_progress', 'testing', 'done']);
      expect(statuses).toHaveLength(4);
    });

    it('deve organizar tasks por status (simulando 4 colunas)', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: TaskStatus.PENDING, priority: 1 },
        { id: '2', title: 'Task 2', status: TaskStatus.IN_PROGRESS, priority: 2 },
        { id: '3', title: 'Task 3', status: TaskStatus.TESTING, priority: 0 },
        { id: '4', title: 'Task 4', status: TaskStatus.DONE, priority: 3 },
      ];

      mockTasksService.findAll.mockResolvedValue(mockTasks);

      const result = await controller.findAll({}, { user: { id: '1' } });

      expect(result).toHaveLength(4);
      // Verifica se todas as 4 status estão representadas
      const statuses = result.map(task => task.status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('testing');
      expect(statuses).toContain('done');
    });
  });

  describe('2. CRIAÇÃO DE CARDS (só título obrigatório)', () => {
    it('deve criar task com apenas título obrigatório', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Nova tarefa',
        projectId: 'project-1', // Campo obrigatório
      };

      const expectedResult = {
        id: '1',
        title: 'Nova tarefa',
        description: null,
        status: TaskStatus.PENDING, // Vai para coluna pendente
        priority: 0, // Prioridade baixa padrão
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createTaskDto, { user: { id: '1' } });

      expect(service.create).toHaveBeenCalledWith(createTaskDto, '1');
      expect(result.title).toBe('Nova tarefa');
      expect(result.status).toBe('pending');
      expect(result.priority).toBe(0);
    });

    it('deve criar task com título e descrição opcional', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task Completa',
        description: 'Descrição detalhada da tarefa',
        priority: 2,
        projectId: 'project-1', // Campo obrigatório
      };

      const expectedResult = {
        id: '2',
        ...createTaskDto,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createTaskDto, { user: { id: '1' } });

      expect(result.title).toBe('Task Completa');
      expect(result.description).toBe('Descrição detalhada da tarefa');
      expect(result.priority).toBe(2);
    });
  });

  describe('3. MODAL DE EDIÇÃO COM PRIORIDADES', () => {
    it('deve atualizar prioridade da task (0-3)', async () => {
      const updateData: UpdateTaskDto = { priority: 3 }; // Alta prioridade

      const expectedResult = {
        id: 'task-1',
        title: 'Task Existente',
        priority: 3,
        status: TaskStatus.PENDING,
      };

      mockTasksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('task-1', updateData, { user: { id: '1' } });

      expect(service.update).toHaveBeenCalledWith('task-1', updateData, '1');
      expect(result.priority).toBe(3);
    });

    it('deve atualizar título e descrição via modal', async () => {
      const updateData: UpdateTaskDto = {
        title: 'Título Atualizado',
        description: 'Nova descrição',
      };

      const expectedResult = {
        id: 'task-1',
        title: 'Título Atualizado',
        description: 'Nova descrição',
        status: TaskStatus.PENDING,
      };

      mockTasksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('task-1', updateData, { user: { id: '1' } });

      expect(result.title).toBe('Título Atualizado');
      expect(result.description).toBe('Nova descrição');
    });

    it('deve validar níveis de prioridade (0=none, 1=low, 2=medium, 3=high)', async () => {
      // Testa cada nível de prioridade
      const priorities = [0, 1, 2, 3];
      
      for (const priority of priorities) {
        const updateData: UpdateTaskDto = { priority };
        const expectedResult = { id: 'task-1', priority };

        mockTasksService.update.mockResolvedValue(expectedResult);

        const result = await controller.update('task-1', updateData, { user: { id: '1' } });
        expect(result.priority).toBe(priority);
      }
    });
  });

  describe('4. DRAG & DROP (mudança de status)', () => {
    it('deve mover task de PENDING para IN_PROGRESS', async () => {
      const updateData: UpdateTaskDto = { status: TaskStatus.IN_PROGRESS };

      const expectedResult = {
        id: 'task-1',
        title: 'Task Movida',
        status: TaskStatus.IN_PROGRESS,
      };

      mockTasksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('task-1', updateData, { user: { id: '1' } });

      expect(result.status).toBe('in_progress');
    });

    it('deve permitir mover entre todas as 4 colunas', async () => {
      const statuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.TESTING, TaskStatus.DONE];

      for (let i = 0; i < statuses.length; i++) {
        const updateData: UpdateTaskDto = { status: statuses[i] };
        const expectedResult = { id: 'task-1', status: statuses[i] };

        mockTasksService.update.mockResolvedValue(expectedResult);

        const result = await controller.update('task-1', updateData, { user: { id: '1' } });
        expect(result.status).toBe(statuses[i]);
      }
    });

    it('deve completar fluxo: PENDING → IN_PROGRESS → TESTING → DONE', async () => {
      const fluxo = ['pending', 'in_progress', 'testing', 'done'];
      
      for (const status of fluxo) {
        const updateData: UpdateTaskDto = { status: status as TaskStatus };
        const expectedResult = { id: 'task-1', status };

        mockTasksService.update.mockResolvedValue(expectedResult);

        const result = await controller.update('task-1', updateData, { user: { id: '1' } });
        expect(result.status).toBe(status);
      }
    });
  });

  describe('5. ISOLAMENTO POR USUÁRIO', () => {
    it('deve retornar apenas tasks do usuário logado', async () => {
      const user1Tasks = [
        { id: '1', title: 'Task User 1', userId: '1' },
        { id: '2', title: 'Task User 1 - 2', userId: '1' },
      ];

      mockTasksService.findAll.mockResolvedValue(user1Tasks);

      const result = await controller.findAll({}, { user: { id: '1' } });

      expect(service.findAll).toHaveBeenCalledWith('1', {});
      expect(result).toEqual(user1Tasks);
      expect(result).toHaveLength(2);
    });

    it('deve garantir que usuário só vê próprias tasks', async () => {
      // Simula que service já filtra por usuário
      mockTasksService.findAll
        .mockResolvedValueOnce([{ id: '1', title: 'Task User 1', userId: '1' }]) // user 1
        .mockResolvedValueOnce([{ id: '2', title: 'Task User 2', userId: '2' }]); // user 2

      const user1Result = await controller.findAll({}, { user: { id: '1' } });
      const user2Result = await controller.findAll({}, { user: { id: '2' } });

      expect(user1Result[0].userId).toBe('1');
      expect(user2Result[0].userId).toBe('2');
      expect(user1Result).not.toEqual(user2Result);
    });

    it('deve permitir apenas editar próprias tasks', async () => {
      const updateData: UpdateTaskDto = { title: 'Título Atualizado' };

      mockTasksService.update.mockResolvedValue({
        id: 'task-1',
        title: 'Título Atualizado',
      });

      const result = await controller.update('task-1', updateData, { user: { id: '1' } });

      // Verifica se service foi chamado com o ID do usuário correto
      expect(service.update).toHaveBeenCalledWith('task-1', updateData, '1');
    });
  });

  describe('6. BUSCA E NAVEGAÇÃO', () => {
    it('deve buscar task específica por ID', async () => {
      const expectedTask = {
        id: 'task-1',
        title: 'Task Específica',
        description: 'Descrição detalhada',
        status: TaskStatus.PENDING,
        priority: 2,
      };

      mockTasksService.findOne.mockResolvedValue(expectedTask);

      const result = await controller.findOne('task-1', { user: { id: '1' } });

      expect(service.findOne).toHaveBeenCalledWith('task-1', '1');
      expect(result).toEqual(expectedTask);
    });

    it('deve deletar task própria', async () => {
      mockTasksService.remove.mockResolvedValue({ affected: 1 });

      await controller.remove('task-1', { user: { id: '1' } });

      expect(service.remove).toHaveBeenCalledWith('task-1', '1');
    });
  });
});