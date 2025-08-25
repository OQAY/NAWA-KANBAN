import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../database/entities/project.entity';
import { Task } from '../../database/entities/task.entity';
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
      // Criar projeto padrão com ID fixo compatível com frontend
      const DEFAULT_PROJECT_ID = '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf';
      
      // Verificar se projeto padrão já existe
      let savedProject = await this.projectRepository.findOne({ where: { id: DEFAULT_PROJECT_ID } });
      
      if (!savedProject) {
        const defaultProject = this.projectRepository.create({
          id: DEFAULT_PROJECT_ID,
          name: 'Projeto Padrão Kanban',
          description: 'Projeto compartilhado para todas as tarefas do sistema',
          ownerId: user.id,
        });
        
        savedProject = await this.projectRepository.save(defaultProject);
      }

      // Criar tasks exemplo - uma para cada coluna
      const exampleTasks = [
        {
          title: 'Tarefa Pendente',
          description: 'Esta tarefa está aguardando início',
          status: 'pending',
          priority: 1,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Em Progresso',
          description: 'Esta tarefa está sendo trabalhada atualmente',
          status: 'in_progress',
          priority: 2,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Em Teste',
          description: 'Esta tarefa está sendo validada',
          status: 'testing',
          priority: 2,
          projectId: savedProject.id,
          createdById: user.id,
          assigneeId: user.id,
        },
        {
          title: 'Tarefa Concluída',
          description: 'Esta tarefa foi finalizada com sucesso',
          status: 'done',
          priority: 1,
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