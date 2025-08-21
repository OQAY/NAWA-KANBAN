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
    
    return this.commentRepository.findOne({
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
  }

  async findByTask(taskId: string, currentUser: User): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.commentRepository.find({
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

    return this.commentRepository.findOne({
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