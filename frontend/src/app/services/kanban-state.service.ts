/**
 * Serviço de estado do Kanban
 * Extrai métodos de manipulação de tarefas do componente principal
 */
import { Injectable } from '@angular/core';
import { TaskService } from './task.service';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class KanbanStateService {
  // Variáveis de estado copiadas do kanban.component.ts
  tasks: Task[] = [];
  columns = [
    { id: 'pending', status: 'pending', label: 'Pendente', type: 'standard', order: 0 },
    { id: 'in_progress', status: 'in_progress', label: 'Em Progresso', type: 'standard', order: 1 },
    { id: 'testing', status: 'testing', label: 'Testando', type: 'standard', order: 2 },
    { id: 'done', status: 'done', label: 'Concluído', type: 'standard', order: 3 }
  ];

  addingToColumn: { [key: string]: boolean } = {};
  modalTask: Task | null = null;
  showModal = false;

  constructor(private taskService: TaskService) {}

  // Método copiado exato do kanban.component.ts
  async loadTasks(): Promise<void> {
    try {
      this.taskService.getTasks().subscribe({
        next: (tasks) => {
          this.tasks = tasks;
        },
        error: (error) => {
          console.error('Erro ao carregar tarefas:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  }

  // Método copiado do kanban.component.ts - getTasksByStatusString
  getTasksByStatus(status: string): Task[] {
    const tasks = this.tasks.filter(task => task.status === status);
    
    // Ordenação por prioridade (3->2->1->0) depois por data de criação
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  // Método para criar tarefa
  async createTask(status: string, title: string): Promise<void> {
    const taskData: CreateTaskRequest = {
      title: title.trim(),
      description: '',
      priority: TaskPriority.NONE,
      projectId: 'default-project'
    };

    this.taskService.createTask(taskData).subscribe({
      next: (newTask) => {
        this.tasks.push(newTask);
      },
      error: (error) => {
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  // Método para atualizar tarefa
  async updateTask(taskId: string, changes: Partial<Task>): Promise<void> {
    const updateData: UpdateTaskRequest = changes;
    
    this.taskService.updateTask(taskId, updateData).subscribe({
      next: (updatedTask) => {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
        }
      },
      error: (error) => {
        console.error('Erro ao atualizar tarefa:', error);
      }
    });
  }

  // Método para deletar tarefa
  async deleteTask(taskId: string): Promise<void> {
    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
      },
      error: (error) => {
        console.error('Erro ao deletar tarefa:', error);
      }
    });
  }

  // Métodos para controlar modal
  openModal(task: Task): void {
    this.modalTask = task;
    this.showModal = true;
  }

  closeModal(): void {
    this.modalTask = null;
    this.showModal = false;
  }

  // Métodos para controlar formulário de adicionar
  startAddingCard(status: string): void {
    this.addingToColumn[status] = true;
  }

  stopAddingCard(status: string): void {
    delete this.addingToColumn[status];
  }

  isAddingCard(status: string): boolean {
    return this.addingToColumn[status] || false;
  }
}