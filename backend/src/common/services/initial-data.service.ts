import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../database/entities/project.entity';
import { Task, TaskStatus } from '../../database/entities/task.entity';
import { User } from '../../database/entities/user.entity';

/**
 * Serviço responsável por criar dados iniciais para novos usuários
 * Garante que cada usuário tenha seu próprio conjunto isolado de dados
 */
@Injectable()
export class InitialDataService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * Cria projeto e tasks padrão para um novo usuário
   * Cada usuário recebe:
   * - 1 projeto inicial
   * - 4 tasks exemplo (uma em cada status)
   */
  async createInitialData(user: User): Promise<void> {
    try {
      // Criar projeto padrão
      const defaultProject = this.projectRepository.create({
        name: 'Meu Primeiro Projeto',
        description: 'Projeto inicial para organizar suas tarefas',
        ownerId: user.id,
      });
      
      const savedProject = await this.projectRepository.save(defaultProject);

      // Criar tasks exemplo - uma para cada coluna
      const exampleTasks = [
        {
          title: 'Tarefa A Fazer',
          description: 'Esta é uma tarefa que está planejada para ser executada',
          status: TaskStatus.TO_DO,
          priority: 0,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Pendente',
          description: 'Esta tarefa está aguardando alguma ação ou dependência',
          status: TaskStatus.PENDING,
          priority: 1,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Em Progresso',
          description: 'Esta tarefa está sendo trabalhada atualmente',
          status: TaskStatus.IN_PROGRESS,
          priority: 2,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Concluída',
          description: 'Esta tarefa foi finalizada com sucesso',
          status: TaskStatus.DONE,
          priority: 0,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
      ];

      // Criar todas as tasks
      const tasks = exampleTasks.map(taskData => 
        this.taskRepository.create(taskData)
      );
      
      await this.taskRepository.save(tasks);
      
      console.log(`Dados iniciais criados para usuário: ${user.email}`);
    } catch (error) {
      console.error('Erro ao criar dados iniciais:', error);
      // Não lançar erro para não impedir registro do usuário
    }
  }
}