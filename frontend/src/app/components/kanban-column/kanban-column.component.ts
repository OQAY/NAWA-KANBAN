/**
 * Componente de coluna individual do Kanban
 * Extração simples: cópia exata do template de coluna existente
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';
import { AddCardFormComponent } from '../add-card-form/add-card-form.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, TaskCardComponent, AddCardFormComponent],
  host: {
    '[class.column]': 'true',
    '[class.drag-over-column]': 'isDragOverColumn',
    '[class.being-dragged]': 'isBeingDragged',
    '[class.ghost-left]': 'showGhostLeft',
    '[class.ghost-right]': 'showGhostRight',
    '(dragover)': 'onColumnDragOver($event)',
    '(dragleave)': 'onColumnDragLeave()',
    '(drop)': 'onColumnDrop($event)'
  },
  template: `
    <!-- TEMPLATE EXATO COPIADO DO ARQUIVO PRINCIPAL -->
    <div class="column-header" 
         draggable="true"
         (dragstart)="onColumnDragStart($event)"
         (dragend)="onColumnDragEnd()">
      <h3>{{ column.label }}</h3>
      <span class="task-count">{{ tasks.length }}</span>
    </div>
    
    <div class="column-content"
         (dragover)="onDragOver($event)"
         (drop)="onDrop($event)"
         [attr.data-status]="column.status">
      <app-task-card 
        *ngFor="let task of tasks"
        [task]="task"
        [columnStatus]="column.status"
        (dragStart)="onTaskDragStart($event)"
        (dragEnd)="onTaskDragEnd()"
        (touchStart)="onTaskTouchStart($event)"
        (touchMove)="onTaskTouchMove($event)"
        (touchEnd)="onTaskTouchEnd($event)"
        (cardClick)="onTaskClick($event)">
      </app-task-card>
      
      <div *ngIf="tasks.length === 0" class="empty-column">
        Nenhuma tarefa
      </div>
      
      <app-add-card-form
        [isActive]="isAddingCard"
        [columnStatus]="column.status"
        (startAddCard)="onStartAddCard($event)"
        (confirmAddCard)="onConfirmAddCard($event)"
        (cancelAddCard)="onCancelAddCard($event)">
      </app-add-card-form>
    </div>
  `,
  styles: [`
    /* ESTILOS EXATOS COPIADOS DO ARQUIVO PRINCIPAL - SEM ALTERAÇÕES */
    :host {
      backdrop-filter: blur(10px);
      border-radius: 12px;
      width: 240px;
      min-width: 240px;
      flex-shrink: 0;
      transition: all 0.2s ease;
      position: relative;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 300px);
    }

    /* 👻 GHOST COLUMN ANIMATION: Indicadores visuais de inserção */
    :host.being-dragged {
      opacity: 0.5;
      transform: scale(0.95);
      z-index: 1000;
    }

    :host.ghost-left::before {
      content: '';
      position: absolute;
      left: -18px;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(to bottom, #007bff, #0056b3);
      border-radius: 3px;
      box-shadow: 0 0 8px rgba(0, 123, 255, 0.6);
      animation: ghostPulse 1s ease-in-out infinite;
      z-index: 10;
    }

    :host.ghost-right::after {
      content: '';
      position: absolute;
      right: -18px;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(to bottom, #007bff, #0056b3);
      border-radius: 3px;
      box-shadow: 0 0 8px rgba(0, 123, 255, 0.6);
      animation: ghostPulse 1s ease-in-out infinite;
      z-index: 10;
    }

    @keyframes ghostPulse {
      0%, 100% {
        opacity: 0.7;
        transform: scaleY(1);
      }
      50% {
        opacity: 1;
        transform: scaleY(1.02);
      }
    }
    
    .column-header {
      background: rgba(241, 242, 244, 0.95);
      padding: 12px 16px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(228, 230, 234, 0.8);
      backdrop-filter: blur(5px);
    }
    
    .column-header h3 {
      margin: 0;
      font-size: 11px;
      font-weight: 600;
      color: #172b4d;
    }
    
    .task-count {
      background: #ddd;
      color: #5e6c84;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      min-width: 18px;
      text-align: center;
    }
    
    /* Estilos para drag-and-drop de colunas */
    .column-header[draggable="true"] {
      cursor: move;
      transition: all 0.2s ease;
    }
    
    .column-header[draggable="true"]:hover {
      background: rgba(241, 242, 244, 1);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    :host.drag-over-column {
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(0, 123, 255, 0.3);
      border: 2px dashed #007bff;
    }
    
    .column-content {
      background: rgba(241, 242, 244, 0.9);
      padding: 8px;
      border-radius: 0 0 12px 12px;
      transition: all 0.3s ease;
      backdrop-filter: blur(5px);
      overflow-y: auto;
      overflow-x: hidden;
      max-height: calc(100vh - 350px);
    }

    .column-content::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .column-content::-webkit-scrollbar-track {
      background: rgba(241, 242, 244, 0.3);
      border-radius: 3px;
    }
    .column-content::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
    }
    .column-content::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.5);
    }
    
    .empty-column {
      text-align: center;
      color: #9ca3af;
      font-style: italic;
      padding: 20px;
      font-size: 14px;
    }
  `]
})
export class KanbanColumnComponent {
  @Input() column!: { id: string; status: string; label: string; type: string; order: number };
  @Input() tasks: Task[] = [];
  @Input() isAddingCard = false;
  @Input() isDragOverColumn = false;
  @Input() isBeingDragged = false;
  @Input() showGhostLeft = false;
  @Input() showGhostRight = false;

  // Eventos de coluna - passam direto para o pai
  @Output() columnDragOver = new EventEmitter<{event: DragEvent, columnId: string, index: number}>();
  @Output() columnDragLeave = new EventEmitter<void>();
  @Output() columnDrop = new EventEmitter<{event: DragEvent, columnId: string, index: number}>();
  @Output() columnDragStart = new EventEmitter<{event: DragEvent, columnId: string, index: number}>();
  @Output() columnDragEnd = new EventEmitter<void>();

  // Eventos de tarefa - passam direto para o pai
  @Output() taskDragStart = new EventEmitter<Task>();
  @Output() taskDragEnd = new EventEmitter<void>();
  @Output() taskDragOver = new EventEmitter<DragEvent>();
  @Output() taskDrop = new EventEmitter<{event: DragEvent, status: string}>();
  @Output() taskClick = new EventEmitter<Task>();
  @Output() taskTouchStart = new EventEmitter<{event: TouchEvent, task: Task}>();
  @Output() taskTouchMove = new EventEmitter<TouchEvent>();
  @Output() taskTouchEnd = new EventEmitter<{event: TouchEvent, task: Task, status?: string}>();

  // Eventos do formulário - passam direto para o pai
  @Output() startAddCard = new EventEmitter<string>();
  @Output() confirmAddCard = new EventEmitter<{status: string, title: string}>();
  @Output() cancelAddCard = new EventEmitter<string>();

  // Métodos que apenas repassam eventos para o pai
  onColumnDragOver(event: DragEvent): void {
    this.columnDragOver.emit({ event, columnId: this.column.id, index: 0 });
  }

  onColumnDragLeave(): void {
    this.columnDragLeave.emit();
  }

  onColumnDrop(event: DragEvent): void {
    this.columnDrop.emit({ event, columnId: this.column.id, index: 0 });
  }

  onColumnDragStart(event: DragEvent): void {
    this.columnDragStart.emit({ event, columnId: this.column.id, index: 0 });
  }

  onColumnDragEnd(): void {
    this.columnDragEnd.emit();
  }

  onDragOver(event: DragEvent): void {
    this.taskDragOver.emit(event);
  }

  onDrop(event: DragEvent): void {
    this.taskDrop.emit({ event, status: this.column.status });
  }

  onTaskDragStart(task: Task): void {
    this.taskDragStart.emit(task);
  }

  onTaskDragEnd(): void {
    this.taskDragEnd.emit();
  }

  onTaskClick(task: Task): void {
    this.taskClick.emit(task);
  }

  onTaskTouchStart(data: {event: TouchEvent, task: Task}): void {
    this.taskTouchStart.emit(data);
  }

  onTaskTouchMove(event: TouchEvent): void {
    this.taskTouchMove.emit(event);
  }

  onTaskTouchEnd(data: {event: TouchEvent, task: Task, status?: string}): void {
    this.taskTouchEnd.emit({ ...data, status: this.column.status });
  }

  onStartAddCard(status: string): void {
    this.startAddCard.emit(status);
  }

  onConfirmAddCard(data: {status: string, title: string}): void {
    this.confirmAddCard.emit(data);
  }

  onCancelAddCard(status: string): void {
    this.cancelAddCard.emit(status);
  }
}