import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus, TaskPriority } from './task.entity';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  // Mock do service (falso para teste)
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
  });

  // Teste 1: Verificar se controller foi criado
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Teste 2: Criar task
  it('should create a task', async () => {
    const createTaskDto: CreateTaskDto = {
      title: 'Test Task',
      description: 'Test Description',
      priority: TaskPriority.MEDIUM,
    };

    const expectedResult = {
      id: '1',
      ...createTaskDto,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTasksService.create.mockResolvedValue(expectedResult);

    const result = await controller.create(createTaskDto, { user: { id: '1' } });

    expect(service.create).toHaveBeenCalledWith(createTaskDto, '1');
    expect(result).toEqual(expectedResult);
  });

  // Teste 3: Buscar todas as tasks
  it('should return array of tasks', async () => {
    const expectedTasks = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Desc 1',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
      },
    ];

    mockTasksService.findAll.mockResolvedValue(expectedTasks);

    const result = await controller.findAll({ user: { id: '1' } });

    expect(service.findAll).toHaveBeenCalledWith('1');
    expect(result).toEqual(expectedTasks);
  });

  // Teste 4: Buscar task por ID
  it('should return a task by id', async () => {
    const taskId = '1';
    const expectedTask = {
      id: taskId,
      title: 'Task 1',
      description: 'Desc 1',
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
    };

    mockTasksService.findOne.mockResolvedValue(expectedTask);

    const result = await controller.findOne(taskId, { user: { id: '1' } });

    expect(service.findOne).toHaveBeenCalledWith(taskId, '1');
    expect(result).toEqual(expectedTask);
  });
});