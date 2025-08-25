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
    // Isolamento total: cada usuário vê apenas seus próprios projetos
    const query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .where('project.ownerId = :userId', { userId: user.id });

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

    // Isolamento total: apenas o dono do projeto pode atualizar
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('Only project owner can update the project');
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id, user);

    // Isolamento total: apenas o dono do projeto pode deletar
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    await this.projectRepository.remove(project);
  }

  private checkProjectAccess(project: Project, user: User): void {
    // Isolamento total: usuários só podem acessar seus próprios projetos
    if (project.ownerId === user.id) {
      return; // Acesso permitido ao próprio projeto
    }

    throw new ForbiddenException('Access denied to this project');
  }
}