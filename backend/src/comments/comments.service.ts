import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../database/entities/comment.entity';
import { Task } from '../database/entities/task.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  private convertToBrazilTime(comment: Comment): Comment {
    // Converte UTC para UTC-3 (horário de Brasília)
    // Se UTC mostra 00:30, o horário brasileiro é 21:30 (3 horas a menos)
    const brazilTime = new Date(comment.createdAt.getTime() - (3 * 60 * 60 * 1000));
    return { ...comment, createdAt: brazilTime };
  }

  async create(taskId: string, createCommentDto: CreateCommentDto, currentUser: User): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      taskId,
      userId: currentUser.id,
    });

    const savedComment = await this.commentRepository.save(comment);
    
    const result = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
      select: {
        id: true,
        content: true,
        taskId: true,
        userId: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    });

    return result ? this.convertToBrazilTime(result) : result;
  }

  async findByTask(taskId: string, currentUser: User): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comments = await this.commentRepository.find({
      where: { taskId },
      relations: ['user'],
      select: {
        id: true,
        content: true,
        taskId: true,
        userId: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    return comments.map(comment => this.convertToBrazilTime(comment));
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, currentUser: User): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ 
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author, admins, and managers can update comments
    if (
      comment.userId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('You can only update your own comments');
    }

    Object.assign(comment, updateCommentDto);
    const savedComment = await this.commentRepository.save(comment);

    const result = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
      select: {
        id: true,
        content: true,
        taskId: true,
        userId: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    });

    return result ? this.convertToBrazilTime(result) : result;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const comment = await this.commentRepository.findOne({ 
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author, admins, and managers can delete comments
    if (
      comment.userId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }
}