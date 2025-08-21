import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const taskData: any = {
      ...createTaskDto,
      createdById: user.id,
    };
    
    if (createTaskDto.dueDate) {
      taskData.dueDate = new Date(createTaskDto.dueDate);
    }
    
    const task = this.taskRepository.create(taskData);
    const savedTask = await this.taskRepository.save(task);
    return Array.isArray(savedTask) ? savedTask[0] : savedTask;
  }

  async findAll(query: TaskQueryDto, user: User) {
    const { page = 1, limit = 10, status, projectId, assigneeId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.project', 'project');

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    if (assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }

    // Role-based filtering
    if (user.role === UserRole.DEVELOPER) {
      queryBuilder.andWhere(
        '(task.assigneeId = :userId OR task.createdById = :userId)',
        { userId: user.id }
      );
    }

    const [tasks, total] = await queryBuilder
      .orderBy('task.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'createdBy', 'project', 'comments'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    this.checkTaskAccess(task, user);
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.findOne(id, user);
    
    // Check permissions for update
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot update tasks');
    }

    Object.assign(task, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : task.dueDate,
    });

    return this.taskRepository.save(task);
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    // Only admin, manager, or task creator can delete
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER &&
      task.createdById !== user.id
    ) {
      throw new ForbiddenException('Insufficient permissions to delete task');
    }

    await this.taskRepository.remove(task);
  }

  async moveTask(id: string, newProjectId: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot move tasks');
    }

    task.projectId = newProjectId;
    return this.taskRepository.save(task);
  }

  private checkTaskAccess(task: Task, user: User): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return; // Full access
    }

    if (task.assigneeId === user.id || task.createdById === user.id) {
      return; // Access to own tasks
    }

    throw new ForbiddenException('Access denied to this task');
  }
}