/**
 * Componente de formulário para adicionar nova tarefa
 * Responsável apenas pela UI do form inline estilo Trello
 */
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-card-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="add-card-container">
      <!-- Botão para mostrar form -->
      <div *ngIf="!isActive" class="add-card-btn" (click)="startAdding()">
        <span class="plus-icon">+</span>
        <span class="add-text">Adicionar um cartão</span>
      </div>
      
      <!-- Form inline -->
      <div *ngIf="isActive" class="add-card-form">
        <textarea 
          [(ngModel)]="cardTitle"
          placeholder="Insira um título para este cartão..."
          class="card-title-input"
          (keydown)="onKeydown($event)"
          #cardInput>
        </textarea>
        <div class="add-card-actions">
          <button (click)="confirmAdd()" class="btn-add-card">Adicionar cartão</button>
          <button (click)="cancelAdd()" class="btn-cancel-add">✕</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .add-card-container {
      margin-top: 8px;
    }

    .add-card-btn {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      background: transparent;
      transition: all 0.2s;
    }

    .add-card-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #374151;
    }

    .plus-icon {
      font-size: 16px;
      margin-right: 8px;
      font-weight: bold;
    }

    .add-text {
      font-size: 14px;
      font-weight: 500;
    }

    .add-card-form {
      background: white;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid #e5e7eb;
    }

    .card-title-input {
      width: 100%;
      min-height: 60px;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      background: white;
      outline: none;
      margin-bottom: 8px;
    }

    .card-title-input:focus {
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .add-card-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-add-card {
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

    .btn-add-card:hover {
      background: #2563eb;
    }

    .btn-add-card:disabled {
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
  `]
})
export class AddCardFormComponent implements OnChanges {
  @Input() isActive = false;
  @Input() columnStatus!: string;
  
  @Output() startAddCard = new EventEmitter<string>();
  @Output() confirmAddCard = new EventEmitter<{status: string, title: string}>();
  @Output() cancelAddCard = new EventEmitter<string>();

  @ViewChild('cardInput') cardInputRef!: ElementRef<HTMLTextAreaElement>;

  cardTitle = '';

  ngOnChanges() {
    // Auto-focus quando o form fica ativo
    if (this.isActive) {
      setTimeout(() => {
        if (this.cardInputRef?.nativeElement) {
          this.cardInputRef.nativeElement.focus();
        }
      });
    }
  }

  startAdding(): void {
    this.cardTitle = '';
    this.startAddCard.emit(this.columnStatus);
  }

  confirmAdd(): void {
    const title = this.cardTitle.trim();
    if (!title) return;
    
    this.confirmAddCard.emit({ status: this.columnStatus, title });
    this.cardTitle = '';
  }

  cancelAdd(): void {
    this.cardTitle = '';
    this.cancelAddCard.emit(this.columnStatus);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.confirmAdd();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelAdd();
    }
  }
}