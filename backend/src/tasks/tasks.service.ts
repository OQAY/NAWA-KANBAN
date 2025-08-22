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

  /**
   * Cria uma nova tarefa com atribuição automática do criador
   * Regra de Negócio: Todas as tarefas devem ter um criador (createdById)
   */
  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const taskData: any = {
      ...createTaskDto,
      createdById: user.id, // Atribui automaticamente o usuário atual como criador
      assigneeId: createTaskDto.assigneeId || user.id, // Se não especificado, atribui a si mesmo
    };
    
    // Converte string de data para objeto Date para armazenamento no banco
    if (createTaskDto.dueDate) {
      taskData.dueDate = new Date(createTaskDto.dueDate);
    }
    
    const task = this.taskRepository.create(taskData);
    const savedTask = await this.taskRepository.save(task);
    // Trata caso onde TypeORM pode retornar array ao invés de entidade única
    return Array.isArray(savedTask) ? savedTask[0] : savedTask;
  }

  /**
   * Lista tarefas com filtros e paginação
   * Implementa RBAC: Developers só veem suas próprias tarefas
   */
  async findAll(query: TaskQueryDto, user: User) {
    const { page = 1, limit = 10, status, projectId, assigneeId } = query;
    const skip = (page - 1) * limit; // Calcula offset para paginação

    // Constrói query com joins para carregar relacionamentos
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.project', 'project');

    // Aplica filtros opcionais
    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    if (assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }

    // CORREÇÃO CRÍTICA DE SEGURANÇA: TODOS os usuários só veem suas próprias tarefas
    // Cada usuário só pode ver tarefas que criou ou foram atribuídas a ele
    queryBuilder.andWhere(
      '(task.assigneeId = :userId OR task.createdById = :userId)',
      { userId: user.id }
    );

    const [tasks, total] = await queryBuilder
      .orderBy('task.createdAt', 'DESC') // Ordena por data de criação (mais recente primeiro)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Retorna dados paginados com metadados
    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca uma tarefa por ID com verificação de permissão
   * Carrega todos os relacionamentos necessários
   */
  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'createdBy', 'project', 'comments'], // Carrega relacionamentos
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verifica se o usuário tem permissão para ver esta tarefa
    this.checkTaskAccess(task, user);
    return task;
  }

  /**
   * Atualiza uma tarefa existente
   * Regra de Negócio: Viewers não podem editar tarefas
   */
  async update(id: string, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.findOne(id, user); // Busca e verifica permissão
    
    // Verifica permissões para atualização
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot update tasks');
    }

    // Atualiza os campos da tarefa
    Object.assign(task, {
      ...updateTaskDto,
      // Converte data string para Date object se fornecida
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : task.dueDate,
    });

    return this.taskRepository.save(task);
  }

  /**
   * Remove uma tarefa do sistema
   * Regra de Negócio: Apenas admin, manager ou criador da tarefa podem deletar
   */
  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    // Verifica permissões para exclusão (hierarquia de permissões)
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER &&
      task.createdById !== user.id
    ) {
      throw new ForbiddenException('Insufficient permissions to delete task');
    }

    await this.taskRepository.remove(task);
  }

  /**
   * Move uma tarefa para outro projeto
   * Funcionalidade para reorganização de projetos
   */
  async moveTask(id: string, newProjectId: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot move tasks');
    }

    task.projectId = newProjectId;
    return this.taskRepository.save(task);
  }

  /**
   * Método privado para verificar acesso à tarefa baseado no RBAC
   * Hierarquia: Admin/Manager (acesso total) > Developer (próprias tarefas) > Viewer (somente leitura)
   */
  private checkTaskAccess(task: Task, user: User): void {
    // CORREÇÃO CRÍTICA: TODOS os usuários só veem suas próprias tarefas
    // Sistema Kanban pessoal - cada usuário tem seu painel privado
    if (task.assigneeId === user.id || task.createdById === user.id) {
      return; 
    }

    throw new ForbiddenException('Access denied to this task');
  }
}