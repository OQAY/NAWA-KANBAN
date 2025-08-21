import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { Task, TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kanban-board">
      <h2>Kanban Board</h2>
      
      <div class="columns">
        <div class="column" *ngFor="let status of statuses">
          <div class="column-header">
            <h3>{{ getStatusLabel(status) }}</h3>
            <span class="task-count">{{ getTasksByStatus(status).length }}</span>
          </div>
          
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus(status)">
              <h4>{{ task.title }}</h4>
              <p>{{ task.description }}</p>
              <div class="task-meta">
                <span class="priority priority-{{ task.priority }}">{{ task.priority }}</span>
              </div>
            </div>
            
            <div *ngIf="getTasksByStatus(status).length === 0" class="empty-column">
              Nenhuma tarefa
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
      cursor: pointer;
    }
    .task-card:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .task-card h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
    }
    .task-card p {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #6c757d;
      line-height: 1.4;
    }
    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .priority {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .priority-low { background: #d1ecf1; color: #0c5460; }
    .priority-medium { background: #fff3cd; color: #856404; }
    .priority-high { background: #f8d7da; color: #721c24; }
    .empty-column {
      text-align: center;
      color: #6c757d;
      font-style: italic;
      padding: 20px;
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

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (response) => {
        this.tasks = response.data || response;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.tasks = [];
      }
    });
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter(task => task.status === status);
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
}