import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      role,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token
    const payload = { sub: savedUser.id, email: savedUser.email };
    const token = this.jwtService.sign(payload);

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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email OR name
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :emailOrName OR user.name = :emailOrName', { 
        emailOrName: email 
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

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

  async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async createFirstAdmin(createAdminDto: { email: string; password: string; name: string }) {
    // Check if any admin already exists
    const existingAdmin = await this.userRepository.findOne({ 
      where: { role: UserRole.ADMIN } 
    });

    if (existingAdmin) {
      throw new ConflictException('Admin user already exists');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: createAdminDto.email } 
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(createAdminDto.password, saltRounds);

    // Create admin user
    const adminUser = this.userRepository.create({
      email: createAdminDto.email,
      passwordHash,
      name: createAdminDto.name,
      role: UserRole.ADMIN,
    });

    const savedAdmin = await this.userRepository.save(adminUser);

    // Generate JWT token
    const payload = { sub: savedAdmin.id, email: savedAdmin.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: savedAdmin.id,
        email: savedAdmin.email,
        name: savedAdmin.name,
        role: savedAdmin.role,
      },
      message: 'First admin created successfully'
    };
  }

  async promoteToAdmin(requestingUserId: string, targetUserId: string) {
    // Check if requesting user is admin
    const requestingUser = await this.findUserById(requestingUserId);
    
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can promote users');
    }

    // Find target user
    const targetUser = await this.userRepository.findOne({ 
      where: { id: targetUserId } 
    });

    if (!targetUser) {
      throw new UnauthorizedException('Target user not found');
    }

    // Update role
    targetUser.role = UserRole.ADMIN;
    const updatedUser = await this.userRepository.save(targetUser);

    return {
      message: `User ${updatedUser.name} promoted to admin successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      }
    };
  }
}