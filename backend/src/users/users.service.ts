import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: User): Promise<User> {
    // Only admins and managers can create users
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Only admins and managers can create users');
    }

    // Only admins can create admins
    if (createUserDto.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create admin users');
    }

    const { email, password, name, role } = createUserDto;

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

    // Remove password hash from response
    delete savedUser.passwordHash;
    return savedUser;
  }

  async findAll(currentUser: User): Promise<User[]> {
    // Only admins and managers can list all users
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Only admins and managers can list users');
    }

    const users = await this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });

    return users;
  }

  async findOne(id: string, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can view their own profile, admins and managers can view any profile
    if (
      user.id !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can update their own profile (except role), admins and managers can update any profile
    if (user.id !== currentUser.id) {
      if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Only admins can change roles
    if (updateUserDto.role && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Only admins can promote to admin
    if (updateUserDto.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can promote users to admin');
    }

    // Update user
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    // Remove password hash from response
    delete savedUser.passwordHash;
    return savedUser;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    // Only admins can delete users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Cannot delete yourself
    if (id === currentUser.id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
  }
}