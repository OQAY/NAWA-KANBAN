import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DragTarget {
  type: 'task' | 'column';
  id: string;
  data: any;
}

@Component({
  selector: 'app-trash-drop-zone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="trash-zone"
      [class.drag-over]="isDragOver"
      [class.visible]="isDragActive"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)">
      
      <div class="trash-content">
        <div class="trash-icon">🗑️</div>
      </div>
    </div>
  `,
  styles: [`
    .trash-zone {
      position: fixed;
      bottom: 10px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(220, 53, 69, 0.1);
      border: 2px dashed #dc3545;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.3s ease;
      z-index: 1000;
      pointer-events: none;
    }

    .trash-zone.visible {
      opacity: 1;
      transform: scale(1);
      pointer-events: all;
    }

    .trash-zone.drag-over {
      background: rgba(220, 53, 69, 0.2);
      border-color: #dc3545;
      border-style: solid;
      transform: scale(1.1);
    }

    .trash-content {
      text-align: center;
      color: #dc3545;
    }

    .trash-icon {
      font-size: 20px;
    }

    @media (max-width: 768px) {
      .trash-zone {
        width: 45px;
        height: 45px;
        bottom: 10px;
        right: 15px;
      }
      
      .trash-icon {
        font-size: 18px;
      }
    }
  `]
})
export class TrashDropZoneComponent {
  @Input() isDragActive = false;
  @Input() draggedItem: DragTarget | null = null;
  @Output() itemDeleted = new EventEmitter<DragTarget>();

  isDragOver = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    // Only set to false if we're actually leaving the drop zone
    const rect = (event.currentTarget as Element).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = false;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    if (this.draggedItem) {
      this.itemDeleted.emit(this.draggedItem);
    }
  }

  getDragMessage(): string {
    if (!this.draggedItem) return 'Solte para excluir';
    
    switch (this.draggedItem.type) {
      case 'task':
        return 'Excluir tarefa';
      case 'column':
        return 'Excluir coluna';
      default:
        return 'Solte para excluir';
    }
  }
}