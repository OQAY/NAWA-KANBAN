import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/entities/project.entity';
import { ProjectMember } from '../database/entities/project-member.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  // Project Members Management

  async getMembers(projectId: string, user: User): Promise<ProjectMember[]> {
    const project = await this.findOne(projectId, user);

    return this.projectMemberRepository.find({
      where: { projectId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(projectId: string, addMemberDto: AddMemberDto, user: User): Promise<ProjectMember> {
    const project = await this.findOne(projectId, user);

    // Apenas o dono pode adicionar membros
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('Only project owner can add members');
    }

    // Buscar usuário pelo email
    const memberUser = await this.userRepository.findOne({ where: { email: addMemberDto.email } });
    if (!memberUser) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found`);
    }

    // Verificar se já é membro
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: memberUser.id },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    // Criar novo membro
    const member = this.projectMemberRepository.create({
      projectId,
      userId: memberUser.id,
      role: addMemberDto.role,
    });

    const savedMember = await this.projectMemberRepository.save(member);

    // Retornar com a relação user carregada
    return this.projectMemberRepository.findOne({
      where: { id: savedMember.id },
      relations: ['user'],
    });
  }

  async updateMember(projectId: string, memberId: string, updateMemberDto: UpdateMemberDto, user: User): Promise<ProjectMember> {
    const project = await this.findOne(projectId, user);

    // Apenas o dono pode atualizar membros
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('Only project owner can update members');
    }

    const member = await this.projectMemberRepository.findOne({
      where: { id: memberId, projectId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = updateMemberDto.role;
    return this.projectMemberRepository.save(member);
  }

  async removeMember(projectId: string, memberId: string, user: User): Promise<void> {
    const project = await this.findOne(projectId, user);

    // Apenas o dono pode remover membros
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('Only project owner can remove members');
    }

    const member = await this.projectMemberRepository.findOne({
      where: { id: memberId, projectId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.projectMemberRepository.remove(member);
  }

  private checkProjectAccess(project: Project, user: User): void {
    // Isolamento total: usuários só podem acessar seus próprios projetos
    if (project.ownerId === user.id) {
      return; // Acesso permitido ao próprio projeto
    }

    throw new ForbiddenException('Access denied to this project');
  }
}