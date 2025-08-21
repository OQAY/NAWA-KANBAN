import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/entities/project.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto, user: User): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      ownerId: user.id,
    });

    return this.projectRepository.save(project);
  }

  async findAll(user: User): Promise<Project[]> {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.tasks', 'tasks');

    // Role-based filtering
    if (user.role === UserRole.DEVELOPER || user.role === UserRole.VIEWER) {
      query = query.where('project.ownerId = :userId', { userId: user.id });
    }

    return query.orderBy('project.createdAt', 'DESC').getMany();
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'tasks', 'tasks.assignee', 'tasks.createdBy'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    this.checkProjectAccess(project, user);
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, user: User): Promise<Project> {
    const project = await this.findOne(id, user);

    // Only project owner, managers, and admins can update
    if (
      project.ownerId !== user.id &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Only project owner, managers, or admins can update projects');
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id, user);

    // Only project owner and admins can delete
    if (project.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only project owner or admins can delete projects');
    }

    await this.projectRepository.remove(project);
  }

  private checkProjectAccess(project: Project, user: User): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return; // Full access
    }

    if (project.ownerId === user.id) {
      return; // Access to own projects
    }

    throw new ForbiddenException('Access denied to this project');
  }
}