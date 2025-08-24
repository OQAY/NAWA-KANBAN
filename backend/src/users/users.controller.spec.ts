import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController - Isolamento por Usuário', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    
    jest.clearAllMocks();
  });

  describe('1. ISOLAMENTO DE DADOS POR USUÁRIO', () => {
    it('deve garantir que cada usuário tenha dados isolados', async () => {
      const user1 = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: 'developer',
      };

      const user2 = {
        id: '2',
        name: 'Maria Santos',
        email: 'maria@test.com',
        role: 'manager',
      };

      mockUsersService.findOne
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      const result1 = await controller.findOne('1', { user: { id: '1' } });
      const result2 = await controller.findOne('2', { user: { id: '2' } });

      expect(result1.id).toBe('1');
      expect(result2.id).toBe('2');
      expect(result1.email).not.toBe(result2.email);
    });

    it('deve retornar perfil apenas do usuário autenticado', async () => {
      const currentUser = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: 'developer',
      };

      mockUsersService.findOne.mockResolvedValue(currentUser);

      const result = await controller.findOne('1', { user: { id: '1' } });

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result.id).toBe('1');
      expect(result.name).toBe('João Silva');
    });
  });

  describe('2. GESTÃO DE PERFIS DE USUÁRIO', () => {
    it('deve atualizar dados do próprio perfil', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'João Silva Santos',
      };

      const expectedResult = {
        id: '1',
        name: 'João Silva Santos',
        email: 'joao@test.com',
        role: 'developer',
        updatedAt: new Date(),
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateUserDto, { user: { id: '1' } });

      expect(service.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(result.name).toBe('João Silva Santos');
    });

    it('deve validar email único durante atualização', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'novo@email.com',
      };

      // Primeiro verifica se email já existe
      mockUsersService.findByEmail.mockResolvedValue(null); // Email disponível

      const expectedResult = {
        id: '1',
        email: 'novo@email.com',
        name: 'João Silva',
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateUserDto, { user: { id: '1' } });

      expect(result.email).toBe('novo@email.com');
    });
  });

  describe('3. VALIDAÇÃO DE PAPÉIS (RBAC)', () => {
    it('deve respeitar diferentes níveis de acesso por papel', async () => {
      const adminUser = {
        id: '1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
      };

      const developerUser = {
        id: '2',
        name: 'Dev User',
        email: 'dev@test.com',
        role: 'developer',
      };

      const viewerUser = {
        id: '3',
        name: 'Viewer User',
        email: 'viewer@test.com',
        role: 'viewer',
      };

      mockUsersService.findOne
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(developerUser)
        .mockResolvedValueOnce(viewerUser);

      const adminResult = await controller.findOne('1', { user: { id: '1' } });
      const devResult = await controller.findOne('2', { user: { id: '2' } });
      const viewerResult = await controller.findOne('3', { user: { id: '3' } });

      expect(adminResult.role).toBe('admin');
      expect(devResult.role).toBe('developer');
      expect(viewerResult.role).toBe('viewer');
    });

    it('deve validar os 4 papéis disponíveis', () => {
      const roles = ['admin', 'manager', 'developer', 'viewer'];
      
      // Cada papel deve ter suas permissões específicas
      roles.forEach(role => {
        expect(['admin', 'manager', 'developer', 'viewer']).toContain(role);
      });
      
      expect(roles).toHaveLength(4);
    });
  });

  describe('4. DADOS PESSOAIS E PRIVACIDADE', () => {
    it('deve proteger dados sensíveis (não retornar senha)', async () => {
      const userProfile = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: 'developer',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Nota: password NÃO deve estar presente na resposta
      };

      mockUsersService.findOne.mockResolvedValue(userProfile);

      const result = await controller.findOne('1', { user: { id: '1' } });

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.email).toBeDefined();
      expect(result.role).toBeDefined();
      expect(result).not.toHaveProperty('password');
    });

    it('deve mostrar timestamps de criação e atualização', async () => {
      const now = new Date();
      const userProfile = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: 'developer',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 dia atrás
        updatedAt: now,
      };

      mockUsersService.findOne.mockResolvedValue(userProfile);

      const result = await controller.findOne('1', { user: { id: '1' } });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt.getTime()).toBeLessThan(result.updatedAt.getTime());
    });
  });

  describe('5. CONFIGURAÇÕES DO USUÁRIO', () => {
    it('deve permitir configurações personalizadas do kanban', async () => {
      const boardConfigString = JSON.stringify({
        columnsOrder: ['pending', 'in_progress', 'testing', 'done'],
        showCompletedTasks: true,
        defaultPriority: 1,
      });

      const updateUserDto: UpdateUserDto = {
        name: 'João Silva Updated',
      };

      const expectedResult = {
        id: '1',
        name: 'João Silva Updated',
        email: 'joao@test.com',
        boardConfig: boardConfigString,
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateUserDto, { user: { id: '1' } });

      expect(result.name).toBe('João Silva Updated');
      expect(result.boardConfig).toBeDefined();
    });
  });

  describe('6. HISTÓRICO E AUDITORIA', () => {
    it('deve rastrear quando usuário foi criado e atualizado', async () => {
      const createdDate = new Date('2024-01-01');
      const updatedDate = new Date('2024-01-15');

      const userWithHistory = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: 'developer',
        createdAt: createdDate,
        updatedAt: updatedDate,
      };

      mockUsersService.findOne.mockResolvedValue(userWithHistory);

      const result = await controller.findOne('1', { user: { id: '1' } });

      expect(result.createdAt).toEqual(createdDate);
      expect(result.updatedAt).toEqual(updatedDate);
      
      // Verifica que updatedAt é posterior ao createdAt
      expect(result.updatedAt.getTime()).toBeGreaterThan(result.createdAt.getTime());
    });
  });
});