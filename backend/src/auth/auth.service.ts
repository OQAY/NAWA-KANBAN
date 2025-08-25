import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InitialDataService } from '../common/services/initial-data.service';
import { ColumnsService } from '../columns/columns.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private initialDataService: InitialDataService,
    private columnsService: ColumnsService,
  ) {}

  /**
   * Registra um novo usuário no sistema
   * Regra de Negócio: Email deve ser único, senha é hasheada com bcrypt
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name, role } = registerDto;

    // Verifica se já existe usuário com este email
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash da senha com salt rounds alto para segurança
    const saltRounds = 12; // Força computacional adequada para 2024
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Cria novo usuário
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      role,
    });

    const savedUser = await this.userRepository.save(user);

    // Criar colunas iniciais para o novo usuário
    await this.columnsService.createInitialColumns(savedUser);

    // Criar dados iniciais para o novo usuário (projeto e tasks padrão)
    await this.initialDataService.createInitialData(savedUser);

    // Gera JWT token para login automático após registro
    const payload = { sub: savedUser.id, email: savedUser.email };
    const token = this.jwtService.sign(payload);

    // Retorna token e dados básicos do usuário (sem senha)
    return {
      access_token: token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      },
    };
  }

  /**
   * Autentica um usuário no sistema
   * Permite login por email OU nome de usuário para flexibilidade
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Busca usuário por email OU nome (funcionalidade adicional)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :emailOrName OR user.name = :emailOrName', { 
        emailOrName: email 
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verifica se a senha fornecida corresponde ao hash armazenado
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Gera JWT token com dados mínimos necessários
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    // Retorna token e perfil do usuário (sem dados sensíveis)
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Busca usuário por ID (usado pelo JWT Strategy para validação de token)
   * Método auxiliar para autenticação de rotas protegidas
   */
  async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

}