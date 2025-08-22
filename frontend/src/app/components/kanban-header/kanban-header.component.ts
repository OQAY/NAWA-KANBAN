/**
 * Componente de header do Kanban com trash zone
 * Responsável por título e área de delete de tarefas
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kanban-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header-section">
      <h2>{{ title }}</h2>
      <div class="header-actions">
        <button class="logout-btn" 
                (click)="onLogout()"
                title="Sair">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
        <div class="trash-zone" 
             [class.drag-over]="isDragOverTrash"
             (dragover)="onTrashDragOver($event)"
             (dragleave)="onTrashDragLeave($event)"
             (drop)="onTrashDrop($event)">
          <span class="trash-icon">🗑️</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header-section h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      border: 2px dashed rgba(221, 221, 221, 0.8);
      border-radius: 8px;
      background: rgba(249, 249, 249, 0.9);
      cursor: pointer;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      backdrop-filter: blur(5px);
      color: #666;
    }

    .logout-btn:hover {
      border-color: #ff6b6b;
      background: #fff5f5;
      color: #ff6b6b;
      transform: scale(1.05);
    }

    .trash-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border: 2px dashed rgba(221, 221, 221, 0.8);
      border-radius: 8px;
      background: rgba(249, 249, 249, 0.9);
      cursor: pointer;
      transition: all 0.3s ease;
      width: 48px;
      height: 48px;
      backdrop-filter: blur(5px);
    }

    .trash-zone:hover,
    .trash-zone.drag-over {
      border-color: #dc3545;
      background: #fff5f5;
      transform: scale(1.05);
    }

    .trash-icon {
      font-size: 20px;
    }

    .trash-zone.drag-over .trash-icon {
      animation: shake 0.5s ease-in-out infinite;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    /* Responsive */
    @media (max-width: 425px) {
      .header-section {
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .header-section h2 {
        font-size: 20px;
      }
      
      .trash-zone {
        width: 40px;
        height: 40px;
        padding: 8px;
      }
      
      .trash-icon {
        font-size: 18px;
      }
    }
  `]
})
export class KanbanHeaderComponent {
  @Input() title = 'Dashboard';
  @Input() isDragOverTrash = false;
  
  @Output() trashDragOver = new EventEmitter<DragEvent>();
  @Output() trashDragLeave = new EventEmitter<DragEvent>();
  @Output() trashDrop = new EventEmitter<DragEvent>();
  @Output() logoutClick = new EventEmitter<void>();

  onTrashDragOver(event: DragEvent): void {
    event.preventDefault();
    this.trashDragOver.emit(event);
  }

  onTrashDragLeave(event: DragEvent): void {
    this.trashDragLeave.emit(event);
  }

  onTrashDrop(event: DragEvent): void {
    event.preventDefault();
    this.trashDrop.emit(event);
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}