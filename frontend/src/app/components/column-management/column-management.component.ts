import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColumnService } from '../../services/column.service';

interface ColumnData {
  id: string;
  realId?: string;
  status: string;
  label: string;
  type: string;
  order: number;
  color?: string;
}

@Component({
  selector: 'app-column-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Add New Column Section -->
    <div class="add-column-section" *ngIf="showAddColumn">
      <input 
        #columnInput
        type="text" 
        [(ngModel)]="newColumnTitle"
        (keydown)="onColumnTitleKeydown($event)"
        placeholder="Nome da nova coluna"
        class="column-input"
        autofocus>
      <div class="column-actions">
        <button (click)="confirmAddColumn()" class="btn-add-column">Adicionar coluna</button>
        <button (click)="cancelAddColumn()" class="btn-cancel-add">✕</button>
      </div>
    </div>

    <!-- Add Column Button -->
    <button 
      *ngIf="!showAddColumn" 
      (click)="startAddColumn()" 
      class="add-column">
      + Adicionar uma coluna
    </button>
  `,
  styles: [`
    /* Add Column Button - Similar to trash zone style */
    .add-column {
      flex-shrink: 0;
      width: 240px;
      min-width: 180px;
      height: 55px;
      background: rgba(249, 249, 249, 0.9);
      border: 2px dashed rgba(221, 221, 221, 0.8);
      border-radius: 8px;
      cursor: pointer;
      transition: 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #6c757d;
    }

    .add-column:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
    }

    /* Add Column Form Section */
    .add-column-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 240px;
      min-width: 180px;
      background: #ffffff;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .column-input {
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      flex: 1;
    }

    .column-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .column-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-add-column {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-add-column:hover {
      background: #2563eb;
    }

    .btn-add-column:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-cancel-add {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 18px;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      line-height: 1;
    }

    .btn-cancel-add:hover {
      background: #f3f4f6;
      color: #374151;
    }

    @media (max-width: 768px) {
      .add-column, .add-column-section {
        width: 280px;
        min-width: 280px;
      }
    }
  `]
})
export class ColumnManagementComponent {
  @Input() columns: ColumnData[] = [];
  @Output() columnAdded = new EventEmitter<string>();
  @Output() columnsUpdated = new EventEmitter<ColumnData[]>();

  showAddColumn = false;
  newColumnTitle = '';

  constructor(private columnService: ColumnService) {}

  startAddColumn(): void {
    this.showAddColumn = true;
    this.newColumnTitle = '';
  }

  confirmAddColumn(): void {
    if (!this.newColumnTitle.trim()) return;

    const newStatus = this.generateUniqueStatus(this.newColumnTitle);
    const newColumn = {
      name: this.newColumnTitle.trim(),
      status: newStatus
    };

    this.columnService.createColumn(newColumn).subscribe({
      next: (createdColumn) => {
        const columnData: ColumnData = {
          id: createdColumn.id,
          realId: createdColumn.id,
          status: createdColumn.status,
          label: createdColumn.name,
          type: 'normal',
          order: this.columns.length,
          color: '#e3f2fd'
        };

        const updatedColumns = [...this.columns, columnData];
        this.columnsUpdated.emit(updatedColumns);
        this.columnAdded.emit(this.newColumnTitle);
        
        this.cancelAddColumn();
      },
      error: (error) => {
        console.error('Erro ao criar coluna:', error);
        alert('Erro ao criar coluna. Tente novamente.');
      }
    });
  }

  cancelAddColumn(): void {
    this.showAddColumn = false;
    this.newColumnTitle = '';
  }

  onColumnTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmAddColumn();
    } else if (event.key === 'Escape') {
      this.cancelAddColumn();
    }
  }

  deleteColumn(columnId: string): void {
    const column = this.columns.find(c => c.id === columnId);
    if (!column) return;

    if (!confirm(`Tem certeza que deseja excluir a coluna "${column.label}"? Todos os cartões desta coluna serão perdidos.`)) return;

    // Remove from local array first for immediate UI feedback
    const updatedColumns = this.columns.filter(c => c.id !== columnId);
    this.columnsUpdated.emit(updatedColumns);

    // Call backend to delete using real UUID
    const realColumnId = column.realId || column.id;
    this.columnService.deleteColumn(realColumnId).subscribe({
      next: () => {
        console.log('Coluna deletada no backend');
      },
      error: (error: any) => {
        console.error('Erro ao deletar coluna:', error);
        // Rollback on error - restore the column
        this.columnsUpdated.emit(this.columns);
        alert('Erro ao excluir coluna. Tente novamente.');
      }
    });
  }

  private generateUniqueStatus(title: string): string {
    const baseStatus = title.toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const existingStatuses = this.columns.map(c => c.status);
    let uniqueStatus = baseStatus;
    let counter = 1;
    
    while (existingStatuses.includes(uniqueStatus)) {
      uniqueStatus = `${baseStatus}_${counter}`;
      counter++;
    }
    
    return uniqueStatus;
  }
}