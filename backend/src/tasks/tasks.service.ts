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
    };

    // Converte string de data para objeto Date para armazenamento no banco
    if (createTaskDto.dueDate) {
      taskData.dueDate = new Date(createTaskDto.dueDate);
    }

    // Se position não foi fornecida, calcular automaticamente (inserir no final da coluna)
    if (taskData.position === undefined || taskData.position === null) {
      taskData.position = await this.getNextPosition(
        createTaskDto.projectId,
        createTaskDto.status || 'pending'
      );
    } else {
      // Se position foi fornecida, reordenar tasks existentes
      await this.reorderTasksInColumn(
        createTaskDto.projectId,
        createTaskDto.status || 'pending',
        taskData.position,
        null // Não excluir nenhuma task (é criação)
      );
    }

    const task = this.taskRepository.create(taskData);
    const savedTask = await this.taskRepository.save(task);
    // Trata caso onde TypeORM pode retornar array ao invés de entidade única
    return Array.isArray(savedTask) ? savedTask[0] : savedTask;
  }

  /**
   * Lista tarefas com filtros e paginação
   * Isolamento total: usuários só veem suas próprias tarefas
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

    // Isolamento total: todos os usuários só veem suas próprias tarefas
    queryBuilder.andWhere(
      '(task.assigneeId = :userId OR task.createdById = :userId)',
      { userId: user.id }
    );

    const [tasks, total] = await queryBuilder
      .orderBy('task.position', 'ASC') // Ordena por posição customizada
      .addOrderBy('task.createdAt', 'DESC') // Fallback para tasks sem position
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
   * Regra de Negócio: Usuário pode editar suas próprias tarefas
   *
   * IMPORTANTE: Lógica simplificada para performance e evitar race conditions
   * O frontend já recalcula todas as positions localmente antes de enviar
   */
  async update(id: string, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.findOne(id, user); // Busca e verifica permissão

    // Usuário pode editar suas próprias tarefas (sem restrição de role)
    // Atualiza os campos da tarefa FORÇANDO mudança para TypeORM detectar
    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title;
    }
    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description;
    }
    if (updateTaskDto.priority !== undefined) {
      task.priority = updateTaskDto.priority;
    }
    if (updateTaskDto.status !== undefined) {
      task.status = updateTaskDto.status;
    }
    if (updateTaskDto.projectId !== undefined) {
      task.projectId = updateTaskDto.projectId;
    }
    if (updateTaskDto.assigneeId !== undefined) {
      task.assigneeId = updateTaskDto.assigneeId;
    }
    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null;
    }
    if (updateTaskDto.position !== undefined) {
      task.position = updateTaskDto.position;
    }

    // Simplesmente salva a task - sem reordenação no backend
    // O frontend já envia todas as tasks com positions corretas
    return this.taskRepository.save(task);
  }

  /**
   * Remove uma tarefa do sistema
   * Isolamento total: apenas criador da tarefa pode deletar
   */
  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    // Apenas o criador da tarefa pode deletá-la
    if (task.createdById !== user.id) {
      throw new ForbiddenException('Only task creator can delete the task');
    }

    await this.taskRepository.remove(task);
  }

  /**
   * Move uma tarefa para outro projeto
   * Funcionalidade para reorganização de projetos
   */
  async moveTask(id: string, newProjectId: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    // Usuário pode mover suas próprias tarefas (sem restrição de role)
    task.projectId = newProjectId;
    return this.taskRepository.save(task);
  }

  /**
   * Busca tarefas por texto no título ou descrição
   * Funcionalidade de busca para o usuário encontrar tarefas rapidamente
   */
  async searchTasks(searchQuery: string, user: User): Promise<Task[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.project', 'project')
      .where(
        '(task.assigneeId = :userId OR task.createdById = :userId)',
        { userId: user.id }
      )
      .andWhere(
        '(LOWER(task.title) LIKE LOWER(:query) OR LOWER(task.description) LIKE LOWER(:query))',
        { query: `%${searchQuery}%` }
      )
      .orderBy('task.position', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .take(50); // Limita a 50 resultados para performance

    return queryBuilder.getMany();
  }

  /**
   * Método privado para verificar acesso à tarefa
   * Isolamento total: usuários só podem acessar suas próprias tarefas
   */
  private checkTaskAccess(task: Task, user: User): void {
    // Usuários só podem acessar tarefas que criaram ou foram atribuídas a eles
    if (task.assigneeId === user.id || task.createdById === user.id) {
      return;
    }

    throw new ForbiddenException('Access denied to this task');
  }

  /**
   * Calcula a próxima posição disponível na coluna
   * Retorna max(position) + 1 da coluna especificada
   */
  private async getNextPosition(projectId: string, status: string): Promise<number> {
    const result = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.position)', 'maxPosition')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.status = :status', { status })
      .getRawOne();

    const maxPosition = result?.maxPosition ?? -1;
    return maxPosition + 1;
  }

  /**
   * Reordena tasks na coluna quando uma task é inserida em uma posição específica
   * Incrementa a position de todas as tasks com position >= insertPosition
   *
   * @param projectId - ID do projeto
   * @param status - Status/coluna onde a task está sendo inserida
   * @param insertPosition - Posição onde a task será inserida
   * @param excludeTaskId - ID da task sendo movida (para não duplicar reordenação)
   */
  private async reorderTasksInColumn(
    projectId: string,
    status: string,
    insertPosition: number,
    excludeTaskId: string | null
  ): Promise<void> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ position: () => 'position + 1' })
      .where('projectId = :projectId', { projectId })
      .andWhere('status = :status', { status })
      .andWhere('position >= :insertPosition', { insertPosition });

    // Excluir a task sendo movida para evitar incrementar sua própria posição
    if (excludeTaskId) {
      queryBuilder.andWhere('id != :excludeTaskId', { excludeTaskId });
    }

    await queryBuilder.execute();
  }

  /**
   * Fecha o gap deixado quando uma task é removida ou movida de uma coluna
   * Decrementa a position de todas as tasks com position > removedPosition
   */
  private async closeGapInColumn(
    projectId: string,
    status: string,
    removedPosition: number
  ): Promise<void> {
    await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ position: () => 'position - 1' })
      .where('projectId = :projectId', { projectId })
      .andWhere('status = :status', { status })
      .andWhere('position > :removedPosition', { removedPosition })
      .execute();
  }
}