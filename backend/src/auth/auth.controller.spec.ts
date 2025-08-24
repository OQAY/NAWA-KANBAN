import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../database/entities/user.entity';

describe('AuthController - Sistema de Login/Registro', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('1. REGISTRO DE USUÁRIO', () => {
    it('deve registrar novo usuário com dados válidos', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@test.com',
        password: '123456',
        role: UserRole.DEVELOPER,
      };

      const expectedResult = {
        access_token: 'fake-jwt-token',
        user: {
          id: '1',
          name: 'João Silva',
          email: 'joao@test.com',
          role: UserRole.DEVELOPER,
        },
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result.access_token).toBeDefined();
      expect(result.user.email).toBe('joao@test.com');
      expect(result.user.name).toBe('João Silva');
    });

    it('deve rejeitar registro com email duplicado', async () => {
      const registerDto: RegisterDto = {
        name: 'Maria',
        email: 'joao@test.com', // Email já existe
        password: '123456',
        role: UserRole.DEVELOPER,
      };

      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email já está em uso')
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('2. SISTEMA DE LOGIN', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const loginDto: LoginDto = {
        email: 'joao@test.com',
        password: '123456',
      };

      const expectedResult = {
        access_token: 'valid-jwt-token',
        user: {
          id: '1',
          name: 'João Silva',
          email: 'joao@test.com',
          role: UserRole.DEVELOPER,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result.access_token).toBeDefined();
      expect(result.user.id).toBe('1');
    });

    it('deve rejeitar login com credenciais inválidas', async () => {
      const loginDto: LoginDto = {
        email: 'joao@test.com',
        password: 'senha-errada',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas')
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('deve rejeitar login com email inexistente', async () => {
      const loginDto: LoginDto = {
        email: 'naoexiste@test.com',
        password: '123456',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Usuário não encontrado')
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('3. PERFIL DO USUÁRIO', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      const mockUser = {
        id: '1',
        name: 'João Silva',
        email: 'joao@test.com',
        role: UserRole.DEVELOPER,
      };

      const mockRequest = { user: mockUser };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });
});