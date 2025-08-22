/**
 * Componente individual de card de tarefa
 * Responsável apenas pela exibição e eventos básicos do card
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-card" 
         draggable="true"
         (dragstart)="onDragStart()"
         (dragend)="onDragEnd()"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd($event)"
         (click)="onClick()">
      <div class="task-content">
        <h4>{{ task.title }}</h4>
        <p>{{ task.description }}</p>
      </div>
      <div class="task-meta">
        <span class="priority priority-{{ task.priority }}">{{ getPriorityLabel(task.priority) }}</span>
      </div>
    </div>
  `,
  styles: [`
    .task-card {
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .task-content h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .task-content p {
      margin: 0;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    .priority {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-0 { background: #f5f5f5; color: #757575; }  /* Normal - Cinza */
    .priority-1 { background: #e3f2fd; color: #1976d2; }  /* Baixa - Azul */
    .priority-2 { background: #fff3e0; color: #f57c00; }  /* Média - Laranja */
    .priority-3 { background: #ffebee; color: #d32f2f; }  /* Alta - Vermelho */
  `]
})
export class TaskCardComponent {
  @Input() task!: Task;
  @Input() columnStatus!: string;
  
  // Eventos que o componente pai precisa tratar
  @Output() dragStart = new EventEmitter<Task>();
  @Output() dragEnd = new EventEmitter<void>();
  @Output() touchStart = new EventEmitter<{event: TouchEvent, task: Task}>();
  @Output() touchMove = new EventEmitter<TouchEvent>();
  @Output() touchEnd = new EventEmitter<{event: TouchEvent, task: Task, status?: string}>();
  @Output() cardClick = new EventEmitter<Task>();

  onDragStart(): void {
    this.dragStart.emit(this.task);
  }

  onDragEnd(): void {
    this.dragEnd.emit();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStart.emit({ event, task: this.task });
  }

  onTouchMove(event: TouchEvent): void {
    this.touchMove.emit(event);
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEnd.emit({ event, task: this.task, status: this.columnStatus });
  }

  onClick(): void {
    this.cardClick.emit(this.task);
  }

  getPriorityLabel(priority: TaskPriority): string {
    switch(priority) {
      case 0: return 'Normal';   // NONE
      case 1: return 'Baixa';    // LOW
      case 2: return 'Média';    // MEDIUM  
      case 3: return 'Alta';     // HIGH
      default: return 'Normal';
    }
  }
}