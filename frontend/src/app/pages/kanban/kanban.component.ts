import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest } from '../../models/task.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kanban-board">
      <h2>Kanban Board</h2>
      
      <div class="new-task-form">
        <h3>Nova Tarefa</h3>
        <input [(ngModel)]="newTask.title" placeholder="Título da tarefa" class="form-input">
        <textarea [(ngModel)]="newTask.description" placeholder="Descrição" class="form-textarea"></textarea>
        <select [(ngModel)]="newTask.priority" class="form-select">
          <option [value]="0">Baixa</option>
          <option [value]="1">Média</option>
          <option [value]="2">Alta</option>
        </select>
        <button (click)="createTask()" class="btn-create">Criar Tarefa</button>
      </div>
      
      <div class="columns">
        <div class="column" *ngFor="let status of statuses">
          <div class="column-header">
            <h3>{{ getStatusLabel(status) }}</h3>
            <span class="task-count">{{ getTasksByStatus(status).length }}</span>
          </div>
          
          <div class="column-content"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event, status)">
            <div class="task-card" 
                 *ngFor="let task of getTasksByStatus(status)"
                 draggable="true"
                 (dragstart)="onDragStart(task)"
                 (dragend)="onDragEnd()"
                 (click)="openTaskModal(task)">
              <div class="task-content">
                <h4>{{ task.title }}</h4>
                <p>{{ task.description }}</p>
              </div>
              <div class="task-meta">
                <span class="priority priority-{{ task.priority }}">{{ getPriorityLabel(task.priority) }}</span>
              </div>
            </div>
            
            <div *ngIf="getTasksByStatus(status).length === 0" class="empty-column">
              Nenhuma tarefa
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal Task Details -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 *ngIf="!editingTask">{{ modalTask?.title }}</h2>
            <input *ngIf="editingTask" [(ngModel)]="editForm.title" class="modal-title-input">
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="modal-section">
              <h3>Descrição</h3>
              <p *ngIf="!editingTask">{{ modalTask?.description || 'Sem descrição' }}</p>
              <textarea *ngIf="editingTask" [(ngModel)]="editForm.description" class="modal-description-input"></textarea>
            </div>
            
            <div class="modal-section">
              <h3>Informações</h3>
              <div class="task-info">
                <span class="info-item">
                  <strong>Prioridade:</strong> 
                  <span class="priority priority-{{ modalTask?.priority }}">{{ getPriorityLabel(modalTask?.priority!) }}</span>
                </span>
                <span class="info-item">
                  <strong>Status:</strong> {{ getStatusLabel(modalTask?.status!) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <div *ngIf="!editingTask" class="modal-actions">
              <button (click)="startEdit()" class="btn-edit-modal">Editar</button>
              <button (click)="deleteTask(modalTask!.id)" class="btn-delete-modal">Excluir</button>
            </div>
            <div *ngIf="editingTask" class="modal-actions">
              <button (click)="saveModalEdit()" class="btn-save-modal">Salvar</button>
              <button (click)="cancelModalEdit()" class="btn-cancel-modal">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kanban-board {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .new-task-form {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 1fr 2fr 1fr 1fr;
      gap: 10px;
      align-items: end;
    }
    .new-task-form h3 {
      grid-column: 1 / -1;
      margin: 0 0 10px 0;
    }
    .form-input, .form-textarea, .form-select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .form-textarea {
      resize: vertical;
      min-height: 60px;
    }
    .btn-create {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    .columns {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    .column {
      background: #f8f9fa;
      border-radius: 8px;
      min-height: 400px;
    }
    .column-header {
      background: #e9ecef;
      padding: 15px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .column-header h3 {
      margin: 0;
      font-size: 16px;
    }
    .task-count {
      background: #6c757d;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .column-content {
      padding: 15px;
    }
    .task-card {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      border: 1px solid #dee2e6;
      cursor: grab;
      min-height: 100px;
      max-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .task-card:active {
      cursor: grabbing;
    }
    .task-card:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .task-content {
      flex: 1;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .task-card h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-card p {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #6c757d;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
    }
    .task-actions {
      display: flex;
      gap: 5px;
    }
    .btn-edit, .btn-delete {
      padding: 2px 6px;
      border: none;
      border-radius: 3px;
      font-size: 10px;
      cursor: pointer;
    }
    .btn-edit {
      background: #ffc107;
      color: #000;
    }
    .btn-delete {
      background: #dc3545;
      color: white;
    }
    .edit-form {
      padding: 5px 0;
    }
    .edit-input, .edit-textarea {
      width: 100%;
      margin-bottom: 8px;
      padding: 6px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 12px;
    }
    .edit-textarea {
      min-height: 60px;
      resize: vertical;
    }
    .edit-actions {
      display: flex;
      gap: 5px;
    }
    .btn-save, .btn-cancel {
      padding: 4px 8px;
      border: none;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
    }
    .btn-save {
      background: #28a745;
      color: white;
    }
    .btn-cancel {
      background: #6c757d;
      color: white;
    }
    .priority {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .priority-0 { background: #d1ecf1; color: #0c5460; }
    .priority-1 { background: #fff3cd; color: #856404; }
    .priority-2 { background: #f8d7da; color: #721c24; }
    .empty-column {
      text-align: center;
      color: #6c757d;
      font-style: italic;
      padding: 20px;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }
    .modal-title-input {
      font-size: 24px;
      font-weight: bold;
      border: 1px solid #ddd;
      padding: 8px;
      border-radius: 4px;
      flex: 1;
      margin-right: 10px;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
    }
    .close-btn:hover {
      color: #000;
    }
    .modal-body {
      padding: 20px;
    }
    .modal-section {
      margin-bottom: 25px;
    }
    .modal-section h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #555;
    }
    .modal-section p {
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #333;
    }
    .modal-description-input {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
    }
    .task-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-footer {
      padding: 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
    }
    .modal-actions {
      display: flex;
      gap: 10px;
    }
    .btn-edit-modal, .btn-delete-modal, .btn-save-modal, .btn-cancel-modal {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-edit-modal {
      background: #ffc107;
      color: #000;
    }
    .btn-delete-modal {
      background: #dc3545;
      color: white;
    }
    .btn-save-modal {
      background: #28a745;
      color: white;
    }
    .btn-cancel-modal {
      background: #6c757d;
      color: white;
    }
  `]
})
export class KanbanComponent implements OnInit {
  tasks: Task[] = [];
  statuses: TaskStatus[] = [
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.TESTING,
    TaskStatus.DONE
  ];
  
  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
  };
  
  draggedTask: Task | null = null;
  editingTask: Task | null = null;
  editForm = {
    title: '',
    description: ''
  };
  showModal = false;
  modalTask: Task | null = null;

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (response) => {
        this.tasks = response.data || response;
        console.log('Tasks loaded:', this.tasks);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.tasks = [];
      }
    });
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks
      .filter(task => task.status === status)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getStatusLabel(status: TaskStatus): string {
    const labels = {
      [TaskStatus.PENDING]: 'Pendente',
      [TaskStatus.IN_PROGRESS]: 'Em Progresso',
      [TaskStatus.TESTING]: 'Teste',
      [TaskStatus.DONE]: 'Concluído'
    };
    return labels[status];
  }

  getPriorityLabel(priority: TaskPriority): string {
    const labels = {
      [TaskPriority.LOW]: 'Baixa',
      [TaskPriority.MEDIUM]: 'Média',
      [TaskPriority.HIGH]: 'Alta'
    };
    return labels[priority];
  }

  createTask(): void {
    if (!this.newTask.title.trim()) return;
    
    const taskData = {
      ...this.newTask,
      priority: Number(this.newTask.priority)
    };
    
    this.taskService.createTask(taskData).subscribe({
      next: (task) => {
        this.tasks.push(task);
        this.resetForm();
      },
      error: (error) => console.error('Error creating task:', error)
    });
  }

  editTask(task: Task): void {
    this.editingTask = task;
    this.editForm = {
      title: task.title,
      description: task.description
    };
  }

  saveEdit(): void {
    if (!this.editingTask) return;
    
    const hasChanges = this.editForm.title !== this.editingTask.title || 
                      this.editForm.description !== this.editingTask.description;
    
    if (hasChanges && this.editForm.title.trim()) {
      this.taskService.updateTask(this.editingTask.id, {
        title: this.editForm.title,
        description: this.editForm.description
      }).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === this.editingTask!.id);
          if (index !== -1) this.tasks[index] = updatedTask;
          this.editingTask = null;
        },
        error: (error) => {
          console.error('Error updating task:', error);
          this.editingTask = null;
        }
      });
    } else {
      this.editingTask = null;
    }
  }

  cancelEdit(): void {
    this.editingTask = null;
  }

  deleteTask(taskId: string): void {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(t => t.id !== taskId);
        },
        error: (error) => console.error('Error deleting task:', error)
      });
    }
  }

  private resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
    };
  }

  onDragStart(task: Task): void {
    this.draggedTask = task;
  }

  onDragEnd(): void {
    this.draggedTask = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, newStatus: TaskStatus): void {
    event.preventDefault();
    
    if (!this.draggedTask || this.draggedTask.status === newStatus) {
      return;
    }

    const oldTask = this.draggedTask;
    
    // Atualizar localmente primeiro para feedback instantâneo
    const index = this.tasks.findIndex(t => t.id === oldTask.id);
    if (index !== -1) {
      this.tasks[index] = { 
        ...this.tasks[index], 
        status: newStatus,
        updatedAt: new Date()
      };
    }

    // Depois atualizar no servidor - preservar prioridade
    this.taskService.updateTask(oldTask.id, { 
      status: newStatus,
      priority: oldTask.priority
    }).subscribe({
      next: (updatedTask) => {
        console.log('Task updated from server:', updatedTask);
        console.log('Priority value:', updatedTask.priority, 'Type:', typeof updatedTask.priority);
        // Já foi atualizado localmente, só garantir que está sincronizado
        const currentIndex = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (currentIndex !== -1) this.tasks[currentIndex] = updatedTask;
        this.draggedTask = null;
      },
      error: (error) => {
        // Reverter mudança local em caso de erro
        const currentIndex = this.tasks.findIndex(t => t.id === oldTask.id);
        if (currentIndex !== -1) {
          this.tasks[currentIndex] = { ...this.tasks[currentIndex], status: oldTask.status };
        }
        console.error('Error updating task status:', error);
        this.draggedTask = null;
      }
    });
  }

  openTaskModal(task: Task): void {
    this.modalTask = task;
    this.showModal = true;
    this.editingTask = null;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalTask = null;
    this.editingTask = null;
  }

  startEdit(): void {
    if (!this.modalTask) return;
    this.editingTask = this.modalTask;
    this.editForm = {
      title: this.modalTask.title,
      description: this.modalTask.description
    };
  }

  saveModalEdit(): void {
    if (!this.editingTask || !this.modalTask) return;
    
    const hasChanges = this.editForm.title !== this.editingTask.title || 
                      this.editForm.description !== this.editingTask.description;
    
    if (hasChanges && this.editForm.title.trim()) {
      this.taskService.updateTask(this.editingTask.id, {
        title: this.editForm.title,
        description: this.editForm.description
      }).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === this.editingTask!.id);
          if (index !== -1) this.tasks[index] = updatedTask;
          this.modalTask = updatedTask;
          this.editingTask = null;
        },
        error: (error) => {
          console.error('Error updating task:', error);
          this.editingTask = null;
        }
      });
    } else {
      this.editingTask = null;
    }
  }

  cancelModalEdit(): void {
    this.editingTask = null;
  }
}