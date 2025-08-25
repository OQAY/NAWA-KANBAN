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
    <div class="column-management">
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
          <button (click)="confirmAddColumn()" class="confirm-btn">✓</button>
          <button (click)="cancelAddColumn()" class="cancel-btn">✗</button>
        </div>
      </div>

      <!-- Add Column Button -->
      <button 
        *ngIf="!showAddColumn" 
        (click)="startAddColumn()" 
        class="add-column-btn">
        + Adicionar Coluna
      </button>
    </div>
  `,
  styles: [`
    .column-management {
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 10px;
    }

    .add-column-section {
      display: flex;
      align-items: center;
      gap: 10px;
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
      gap: 5px;
    }

    .confirm-btn, .cancel-btn {
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-btn {
      background: #28a745;
      color: white;
    }

    .cancel-btn {
      background: #dc3545;
      color: white;
    }

    .add-column-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .add-column-btn:hover {
      background: #0056b3;
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