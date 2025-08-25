import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-overlay" *ngIf="isVisible" (click)="onOverlayClick()">
      <div class="notification-modal" [class.shake]="shake" (click)="$event.stopPropagation()">
        <div class="notification-icon" [ngClass]="'icon-' + config.type">
          <svg *ngIf="config.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg *ngIf="config.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg *ngIf="config.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg *ngIf="config.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <svg *ngIf="config.type === 'confirm'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </div>
        
        <h3 class="notification-title">{{ config.title }}</h3>
        <p class="notification-message">{{ config.message }}</p>
        
        <div class="notification-actions">
          <button 
            *ngIf="config.showCancel !== false || config.type === 'confirm'" 
            class="btn-cancel" 
            (click)="onCancel()">
            {{ config.cancelText || 'Cancelar' }}
          </button>
          <button 
            class="btn-confirm" 
            [ngClass]="'btn-' + config.type"
            (click)="onConfirm()">
            {{ config.confirmText || 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .notification-modal {
      background: white;
      border-radius: 12px;
      padding: 32px;
      min-width: 320px;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .notification-modal.shake {
      animation: shake 0.5s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }

    .notification-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-icon svg {
      width: 24px;
      height: 24px;
    }

    .icon-warning {
      background: #fef3c7;
      color: #d97706;
    }

    .icon-error {
      background: #fee2e2;
      color: #dc2626;
    }

    .icon-success {
      background: #d1fae5;
      color: #059669;
    }

    .icon-info {
      background: #dbeafe;
      color: #2563eb;
    }

    .icon-confirm {
      background: #f3f4f6;
      color: #6b7280;
    }

    .notification-title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    .notification-message {
      margin: 0 0 24px;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }

    .notification-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .notification-actions button {
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #6b7280;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
      color: #4b5563;
    }

    .btn-confirm {
      background: #3b82f6;
      color: white;
    }

    .btn-confirm:hover {
      background: #2563eb;
    }

    .btn-confirm.btn-warning {
      background: #f59e0b;
    }

    .btn-confirm.btn-warning:hover {
      background: #d97706;
    }

    .btn-confirm.btn-error {
      background: #ef4444;
    }

    .btn-confirm.btn-error:hover {
      background: #dc2626;
    }

    .btn-confirm.btn-success {
      background: #10b981;
    }

    .btn-confirm.btn-success:hover {
      background: #059669;
    }

    @media (max-width: 480px) {
      .notification-modal {
        min-width: 280px;
        padding: 24px;
        margin: 16px;
      }
    }
  `]
})
export class NotificationModalComponent {
  @Input() config: NotificationConfig = {
    title: '',
    message: '',
    type: 'info'
  };
  @Input() isVisible = false;
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  shake = false;

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onOverlayClick(): void {
    // Shake the modal instead of closing
    this.shake = true;
    setTimeout(() => {
      this.shake = false;
    }, 500);
  }
}