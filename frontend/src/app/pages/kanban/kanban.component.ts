import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { CommentService } from '../../services/comment.service';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '../../models/comment.model';
import { TaskCardComponent } from '../../components/task-card/task-card.component';

/**
 * ENTERPRISE ARCHITECTURE: Interface para estrutura unificada de colunas
 * Define a estrutura padrão para todas as colunas do sistema (padrão + customizadas)
 * - 'standard': Colunas pré-definidas do sistema (pending, in_progress, testing, done)
 * - 'custom': Colunas criadas dinamicamente pelo usuário
 * - 'order': Controla a sequência de exibição das colunas no board
 */
interface ColumnData {
  id: string;
  status: string;
  label: string;
  type: 'standard' | 'custom';
  order: number;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent],
  template: `
    <div class="kanban-board">
      <div class="header-section">
        <h2>Dashboard</h2>
        <div class="trash-zone" 
             [class.drag-over]="isDragOverTrash"
             (dragover)="onTrashDragOver($event)"
             (dragleave)="onTrashDragLeave($event)"
             (drop)="onTrashDrop($event)">
          <span class="trash-icon">🗑️</span>
        </div>
      </div>
      
      <div class="columns-container">
        <div class="columns">
        <!-- ENTERPRISE TEMPLATE: Unified columns com trackBy -->
        <div class="column" *ngFor="let column of columns; trackBy: trackByColumn; let i = index" 
             [class.drag-over-column]="dragOverColumnIndex === i"
             [class.being-dragged]="draggedColumn?.id === column.id"
             [class.ghost-left]="shouldShowGhost(i, 'left')"
             [class.ghost-right]="shouldShowGhost(i, 'right')"
             (dragover)="onColumnDragOver($event, column.id, i)"
             (dragleave)="onColumnDragLeave()"
             (drop)="onColumnDrop($event, column.id, i)">
          <div class="column-header" 
               draggable="true"
               (dragstart)="onColumnDragStart($event, column.id, i)"
               (dragend)="onColumnDragEnd()">
            <h3>{{ column.label }}</h3>
            <span class="task-count">{{ getTasksByStatusString(column.status).length }}</span>
          </div>
          
          <div class="column-content"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event, column.status)"
               [attr.data-status]="column.status">
            <app-task-card 
              *ngFor="let task of getTasksByStatusString(column.status)"
              [task]="task"
              [columnStatus]="column.status"
              (dragStart)="onDragStart($event)"
              (dragEnd)="onDragEnd()"
              (touchStart)="handleTaskTouchStart($event)"
              (touchMove)="onTouchMove($event)"
              (touchEnd)="handleTaskTouchEnd($event)"
              (cardClick)="openTaskModal($event)">
            </app-task-card>
            
            <div *ngIf="getTasksByStatusString(column.status).length === 0" class="empty-column">
              Nenhuma tarefa
            </div>
            
            <!-- Botão adicionar cartão estilo Trello -->
            <div class="add-card-container">
              <div *ngIf="!addingToColumn[column.status]" class="add-card-btn" (click)="startAddingCard(column.status)">
                <span class="plus-icon">+</span>
                <span class="add-text">Adicionar um cartão</span>
              </div>
              
              <div *ngIf="addingToColumn[column.status]" class="add-card-form">
                <textarea 
                  [(ngModel)]="newCardTitle[column.status]"
                  placeholder="Insira um título para este cartão..."
                  class="card-title-input"
                  (keydown)="onCardTitleKeydown($event, column.status)"
                  #cardInput>
                </textarea>
                <div class="add-card-actions">
                  <button (click)="confirmAddCard(column.status)" class="btn-add-card">Adicionar cartão</button>
                  <button (click)="cancelAddCard(column.status)" class="btn-cancel-add">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Adicionar nova coluna - sempre em último lugar -->
        <div class="column add-column-interface">
          <div class="column-header">
            <h3>Adicionar uma lista</h3>
            <span class="task-count">+</span>
          </div>
          
          <div class="column-content">
            <div *ngIf="!addingColumn" class="add-card-container">
              <div class="add-card-btn" (click)="startAddingColumn()">
                <span class="plus-icon">+</span>
                <span class="add-text">Adicionar uma lista</span>
              </div>
            </div>
            
            <div *ngIf="addingColumn" class="add-card-form">
              <textarea 
                [(ngModel)]="newColumnTitle"
                placeholder="Insira o título da lista..."
                class="card-title-input"
                (keydown)="onColumnTitleKeydown($event)"
                maxlength="50">
              </textarea>
              <div class="add-card-actions">
                <button (click)="confirmAddColumn()" class="btn-add-card">Adicionar lista</button>
                <button (click)="cancelAddColumn()" class="btn-cancel-add">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Task Details - Estilo Trello -->
      <div class="modal-overlay" *ngIf="showModal" (mousedown)="onOverlayMouseDown($event)" (mouseup)="onOverlayMouseUp($event)">
        <div class="modal-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" (mouseup)="$event.stopPropagation()">
          <!-- Header pequeno: 10% -->
          <div class="modal-header">
            <div class="header-info">
              <span class="current-status">{{ getStatusLabel(modalTask?.status!) }}</span>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>
          </div>
          
          <!-- Body principal: 2 colunas -->
          <div class="modal-body">
            <!-- Coluna esquerda: 60% - Título e Descrição -->
            <div class="left-column">
              <div class="title-section">
                <h2 *ngIf="!editingTask" (dblclick)="startEdit()">{{ modalTask?.title }}</h2>
                <textarea *ngIf="editingTask" [(ngModel)]="editForm.title" class="title-edit-input" 
                          (input)="autoResize($event); checkForChanges()" #titleTextarea></textarea>
              </div>
              
              <div class="description-section">
                <h3>Descrição</h3>
                <div *ngIf="!editingTask" class="description-view" (dblclick)="startEdit()">
                  <p [class.truncated]="descriptionTruncated">{{ modalTask?.description || 'Adicione uma descrição mais detalhada...' }}</p>
                  <button *ngIf="shouldShowDescriptionToggle()" (click)="toggleDescription(); $event.stopPropagation()" class="toggle-btn">
                    {{ descriptionTruncated ? 'Mostrar mais' : 'Mostrar menos' }}
                  </button>
                </div>
                <textarea *ngIf="editingTask" [(ngModel)]="editForm.description" class="description-edit-input" 
                          placeholder="Adicione uma descrição..." (input)="autoResize($event); checkForChanges()" #descriptionTextarea></textarea>
              </div>
            </div>
            
            <!-- Coluna direita: 40% - Ações e Info -->
            <div class="right-column">
              
              <div class="actions-section">
                <h3>Ações</h3>
                <div class="action-buttons">
                  <button *ngIf="!editingTask" (click)="startEdit()" class="action-btn edit-btn">Editar</button>
                  <button *ngIf="editingTask" (click)="saveModalEdit()" class="action-btn save-btn">Salvar</button>
                  <button *ngIf="editingTask" (click)="cancelModalEdit()" class="action-btn cancel-btn">Cancelar</button>
                  <button (click)="showDeleteConfirm(modalTask!.id)" class="action-btn delete-btn">Excluir</button>
                </div>
              </div>
              
              <div class="info-section">
                <h3>Detalhes</h3>
                <div class="detail-item">
                  <strong>Prioridade</strong>
                  <div class="priority-dropdown" (click)="$event.stopPropagation()">
                    <span class="priority priority-{{ modalTask?.priority }} priority-clickable" 
                          (click)="togglePriorityDropdown()">
                      {{ getPriorityLabel(modalTask?.priority!) }}
                      <span class="dropdown-arrow">▼</span>
                    </span>
                    <div class="priority-options" *ngIf="showPriorityDropdown">
                      <div class="priority-option" 
                           *ngFor="let priority of priorityOptions"
                           (click)="changePriority(priority.value)"
                           [class.selected]="priority.value === modalTask?.priority">
                        <span class="priority priority-{{ priority.value }}">{{ priority.label }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="detail-item">
                  <strong>Status</strong>
                  <div class="status-dropdown" (click)="$event.stopPropagation()">
                    <span class="status status-{{ modalTask?.status }} status-clickable" 
                          (click)="toggleStatusDropdown()">
                      {{ getStatusLabel(modalTask?.status!) }}
                      <span class="dropdown-arrow">▼</span>
                    </span>
                    <div class="status-options" *ngIf="showStatusDropdown">
                      <div class="status-option" 
                           *ngFor="let status of statusOptions"
                           (click)="changeStatus(status.value)"
                           [class.selected]="status.value === modalTask?.status">
                        <span class="status status-{{ status.value }}">{{ status.label }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Seção de Comentários -->
              <div class="comments-section">
                <h3>Comentários</h3>
                
                <!-- Botão Adicionar Comentário -->
                <div class="add-comment-container">
                  <button class="add-comment-btn" 
                          (click)="toggleAddComment()" 
                          [class.active]="showAddComment">
                    + Adicionar um comentário
                  </button>
                </div>

                <!-- Formulário de Novo Comentário -->
                <div class="comment-form" *ngIf="showAddComment">
                  <textarea 
                    [(ngModel)]="newCommentContent"
                    placeholder="Escreva um comentário..."
                    class="comment-input"
                    (keydown)="onCommentKeydown($event)"
                    (blur)="onCommentBlur()"
                    #commentTextarea>
                  </textarea>
                  <div class="comment-actions">
                    <button (click)="saveComment()" class="btn-save-comment" [disabled]="!newCommentContent?.trim()">
                      Salvar
                    </button>
                    <button (click)="cancelComment()" class="btn-cancel-comment">
                      Cancelar
                    </button>
                  </div>
                </div>

                <!-- Lista de Comentários -->
                <div class="comments-list">
                  <div class="comment-item" 
                       *ngFor="let comment of taskComments; trackBy: trackComment"
                       [class.editing]="editingCommentId === comment.id">
                    
                    <!-- Visualização do Comentário -->
                    <div class="comment-view" *ngIf="editingCommentId !== comment.id">
                      <div class="comment-header">
                        <div class="comment-info">
                          <span class="comment-author">{{ comment.user?.name || 'Usuário' }}</span>
                          <span class="comment-date">{{ formatCommentDate(comment.createdAt) }}</span>
                        </div>
                        <div class="comment-buttons">
                          <button class="comment-action-btn" 
                                  (click)="startEditComment(comment)"
                                  title="Editar comentário">
                            ✏️
                          </button>
                          <button class="comment-action-btn delete" 
                                  (click)="deleteComment(comment.id)"
                                  title="Excluir comentário">
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div class="comment-content" 
                           [class.expandable]="isCommentLong(comment.content)"
                           (click)="expandComment(comment)">
                        {{ comment.content }}
                      </div>
                    </div>

                    <!-- Edição do Comentário -->
                    <div class="comment-edit" *ngIf="editingCommentId === comment.id">
                      <textarea 
                        [(ngModel)]="editingCommentContent"
                        class="comment-edit-input"
                        (keydown)="onEditCommentKeydown($event, comment)"
                        (blur)="onEditCommentBlur(comment)"
                        #editCommentTextarea>
                      </textarea>
                      <div class="comment-edit-actions">
                        <button (click)="saveEditComment(comment)" class="btn-save-edit">Salvar</button>
                        <button (click)="cancelEditComment()" class="btn-cancel-edit">Cancelar</button>
                        <button (click)="deleteComment(comment.id)" class="btn-delete-comment">Excluir</button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="no-comments" *ngIf="taskComments.length === 0">
                    Nenhum comentário ainda.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação para Alterações Não Salvas -->
    <div class="modal-overlay" *ngIf="showSaveConfirmModal" (click)="cancelSaveConfirm()">
      <div class="save-confirm-modal" (click)="$event.stopPropagation()">
        <div class="confirm-header">
          <h3>Alterações não salvas</h3>
          <svg class="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 20H2L12 2Z" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 9V13" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 17H12.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="confirm-body">
          <p>Você fez alterações que não foram salvas. O que deseja fazer?</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-save-changes" (click)="saveAndClose()">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            Salvar alterações
          </button>
          <button class="btn-discard-changes" (click)="discardAndClose()">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
              <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2"/>
              <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/>
              <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>
            Descartar alterações
          </button>
          <button class="btn-cancel-close" (click)="cancelSaveConfirm()">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 14L4 9L9 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Continuar editando
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação para Exclusão -->
    <div class="modal-overlay" *ngIf="showDeleteConfirmModal" (click)="cancelDeleteConfirm()">
      <div class="save-confirm-modal" (click)="$event.stopPropagation()">
        <div class="confirm-header">
          <h3>Excluir tarefa</h3>
          <svg class="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 20H2L12 2Z" stroke="#dc3545" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 9V13" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 17H12.01" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="confirm-body">
          <p>Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-delete-confirm" (click)="confirmDelete()">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
              <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2"/>
              <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/>
              <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>
            Excluir tarefa
          </button>
          <button class="btn-cancel-close" (click)="cancelDeleteConfirm()">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 14L4 9L9 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal do Comentário Expandido -->
    <div class="modal-overlay" *ngIf="expandedComment" (click)="closeExpandedComment()">
      <div class="expanded-comment-modal" (click)="$event.stopPropagation()">
        <div class="expanded-comment-header">
          <h3>Comentário</h3>
          <button class="close-btn" (click)="closeExpandedComment()">×</button>
        </div>
        <div class="expanded-comment-body">
          <div class="expanded-comment-author">
            <strong>{{ expandedComment.user?.name || 'Usuário' }}</strong>
            <span class="expanded-comment-date">{{ formatCommentDate(expandedComment.createdAt) }}</span>
          </div>
          <div class="expanded-comment-content">
            {{ expandedComment.content }}
          </div>
        </div>
        <div class="expanded-comment-actions">
          <button class="btn-edit-expanded" (click)="editFromExpanded()">
            ✏️ Editar
          </button>
          <button class="btn-delete-expanded" (click)="deleteFromExpanded()">
            🗑️ Excluir
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kanban-board {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      height: calc(100vh - 120px);
    }
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
      color: #1e293b;
      font-size: 19.6px;
      font-weight: 600;
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
    .trash-text {
      font-size: 14px;
      color: #6c757d;
    }
    .trash-zone.drag-over .trash-text {
      color: #dc3545;
      font-weight: 600;
    }
    .columns-container {
      position: relative;
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 30px;
    }
    
    .columns-container::-webkit-scrollbar {
      height: 8px;
    }
    .columns-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    .columns-container::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    .columns-container::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    .columns {
      display: flex;
      gap: 20px;
      box-sizing: border-box;
      position: relative;
      white-space: normal;
      min-width: 2000px;
    }
    


    /* Scrollbar vertical para conteúdo das colunas */
    .column-content::-webkit-scrollbar {
      width: 6px;
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
    .column {
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
    .column.being-dragged {
      opacity: 0.5;
      transform: scale(0.95);
      z-index: 1000;
    }

    .column.ghost-left::before {
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

    .column.ghost-right::after {
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
    
    .column.drag-over-column {
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(0, 123, 255, 0.3);
      border: 2px dashed #007bff;
    }
    
    .column-header:active {
      opacity: 0.7;
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
    .column-content.drag-over {
      background: #e3f2fd;
      border: 2px dashed #2196f3;
    }
    .task-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      border: 1px solid rgba(222, 226, 230, 0.6);
      cursor: grab;
      min-height: 100px;
      max-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
      transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
      will-change: transform;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .task-card:active {
      cursor: grabbing;
    }
    .task-card.dragging {
      opacity: 0.5;
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 1000;
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
      font-size: 11px;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-card p {
      margin: 0 0 8px 0;
      font-size: 10px;
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
    .priority-0 { background: #f0f0f0; color: #6c757d; }
    .priority-1 { background: #d1ecf1; color: #0c5460; }
    .priority-2 { background: #fff3cd; color: #856404; }
    .priority-3 { background: #f8d7da; color: #721c24; }
    .empty-column {
      text-align: center;
      color: #6c757d;
      font-style: italic;
      padding: 20px;
    }
    
    /* CSS para adicionar cartão estilo Trello */
    .add-card-container {
      margin-top: 8px;
    }
    .add-card-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #5e6c84;
      font-size: 11px;
      transition: all 0.2s ease;
      width: 100%;
      text-align: left;
    }
    .add-card-btn:hover {
      background: #e4e6ea;
      color: #172b4d;
    }
    .plus-icon {
      font-size: 16px;
      font-weight: bold;
    }
    .add-text {
      flex: 1;
    }
    .add-card-form {
      background: white;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 1px 0 rgba(9,30,66,.25);
    }
    .card-title-input {
      width: 100%;
      min-height: 54px;
      padding: 8px 12px;
      border: none;
      border-radius: 3px;
      font-size: 11px;
      line-height: 16px;
      resize: none;
      box-shadow: inset 0 0 0 2px #0079bf;
      outline: none;
      font-family: inherit;
    }
    .add-card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .btn-add-card {
      background: #0079bf;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 400;
    }
    .btn-add-card:hover {
      background: #005a8b;
    }
    .btn-cancel-add {
      background: none;
      border: none;
      padding: 6px;
      cursor: pointer;
      font-size: 20px;
      color: #6b778c;
      border-radius: 3px;
    }
    .btn-cancel-add:hover {
      background: #ddd;
    }
    
    /* CSS para adicionar coluna */
    .add-column-container {
      border: 2px dashed #ddd;
      background: rgba(255, 255, 255, 0.1);
      min-height: 120px;
      display: flex;
      flex-direction: column;
    }
    .add-column-container:hover {
      border-color: #ccc;
      background: rgba(255, 255, 255, 0.15);
    }
    .add-column-title {
      color: #6b778c;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      margin: 0;
      padding: 4px;
      border-radius: 4px;
    }
    .add-column-title:hover {
      color: #172b4d;
      background: rgba(0, 0, 0, 0.05);
    }
    .add-column-form {
      width: 100%;
    }
    .column-title-input {
      width: 100%;
      padding: 8px;
      border: 2px solid #0079bf;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 8px;
      outline: none;
      box-sizing: border-box;
    }
    .add-column-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn-add-column {
      background: #0079bf;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 400;
    }
    .btn-add-column:hover {
      background: #005a8b;
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
      width: 60%;
      height: 80vh;
      margin: 10vh 20%;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
      flex-shrink: 0;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .current-status {
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #495057;
      font-weight: 500;
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
      display: flex;
      flex: 1;
      overflow: visible;
      align-items: flex-start;
    }
    .left-column {
      flex: 0 0 60%;
      min-width: 60%;
      padding: 20px;
      overflow-y: visible;
      border-right: 1px solid #eee;
      align-self: flex-start;
    }
    .right-column {
      flex: 0 0 40%;
      width: 40%;
      padding: 20px;
      background: #f8f9fa;
      overflow-y: auto;
      overflow-x: hidden;
      align-self: stretch;
      flex: 1;
    }
    .title-section h2 {
      margin: 0 0 20px 0;
      font-size: 24px;
      color: #333;
      line-height: 1.3;
      word-wrap: break-word;
      cursor: pointer;
      border: 2px solid transparent;
      border-radius: 4px;
    }
    .title-section h2:hover {
      border: 2px solid #1976d2;
      border-radius: 4px;
    }
    .title-edit-input {
      width: 100%;
      font-size: 24px;
      font-weight: bold;
      border: 2px solid #0079bf;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
      word-wrap: break-word;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      min-height: 40px;
      resize: none;
      overflow: hidden;
    }
    .description-section h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #5e6c84;
      font-weight: 600;
    }
    .description-view {
      cursor: pointer;
      padding: 10px;
      border-radius: 4px;
      margin: -10px;
      border: 2px solid transparent;
    }
    .description-view:hover {
      border: 2px solid #1976d2;
      border-radius: 4px;
    }
    .description-view p {
      margin: 0;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #333;
      font-size: 14px;
    }
    .description-view p.truncated {
      display: -webkit-box;
      -webkit-line-clamp: 15;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .toggle-btn {
      background: none;
      border: none;
      color: #0079bf;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      text-decoration: underline;
    }
    .description-edit-input {
      width: 100%;
      min-height: 150px;
      padding: 10px;
      border: 2px solid #0079bf;
      border-radius: 4px;
      resize: none;
      font-family: inherit;
      font-size: 14px;
      overflow: hidden;
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
    .actions-section, .info-section {
      margin-bottom: 25px;
    }
    .actions-section h3, .info-section h3 {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #5e6c84;
      font-weight: 600;
      text-transform: uppercase;
    }
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .action-btn {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-align: left;
    }
    .edit-btn {
      background: #f4f5f7;
      color: #42526e;
    }
    .edit-btn:hover {
      background: #e4e6ea;
    }
    .delete-btn {
      background: #ffebee;
      color: #d32f2f;
    }
    .delete-btn:hover {
      background: #ffcdd2;
      color: #c62828;
    }
    .save-btn {
      background: #0079bf;
      color: white;
    }
    .cancel-btn {
      background: #f4f5f7;
      color: #42526e;
    }
    .detail-item {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .detail-item strong {
      color: #5e6c84;
      font-size: 12px;
      text-transform: uppercase;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    /* CSS para dropdown de prioridade */
    .priority-dropdown {
      position: relative;
      display: inline-block;
    }
    .priority-clickable {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .priority-clickable:hover {
      background-color: #f4f5f7;
    }
    .dropdown-arrow {
      font-size: 10px;
      color: #6b778c;
    }
    .priority-options {
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #dfe1e6;
      border-radius: 3px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 150px;
      overflow: hidden;
    }
    .priority-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f4f5f7;
    }
    .priority-option:last-child {
      border-bottom: none;
    }
    .priority-option:hover {
      background-color: #f4f5f7;
    }
    .priority-option.selected {
      background-color: #e4e6ea;
      font-weight: 500;
    }
    
    /* CSS para dropdown de status */
    .status-dropdown {
      position: relative;
      display: inline-block;
    }
    .status-clickable {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .status-clickable:hover {
      background-color: #f4f5f7;
    }
    .status-options {
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #dfe1e6;
      border-radius: 3px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 150px;
      overflow: hidden;
    }
    .status-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f4f5f7;
    }
    .status-option:last-child {
      border-bottom: none;
    }
    .status-option:hover {
      background-color: #f4f5f7;
    }
    .status-option.selected {
      background-color: #e4e6ea;
      font-weight: 500;
    }
    .status {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-0 { background: #e9ecef; color: #495057; }
    .status-1 { background: #fff3cd; color: #856404; }
    .status-2 { background: #d1ecf1; color: #0c5460; }
    .status-3 { background: #d4edda; color: #155724; }
    
    /* CSS para modal de confirmação */
    .save-confirm-modal {
      background: white;
      border-radius: 12px;
      max-width: 450px;
      width: 90%;
      margin: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      overflow: hidden;
      animation: modalSlideIn 0.3s ease-out;
    }
    @keyframes modalSlideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .confirm-header {
      background: #f1f2f4;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #172b4d;
      border-bottom: 1px solid #e4e6ea;
    }
    .confirm-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .warning-icon {
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .confirm-body {
      padding: 24px;
      text-align: center;
    }
    .confirm-body p {
      margin: 0;
      font-size: 16px;
      color: #333;
      line-height: 1.5;
    }
    .confirm-actions {
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .confirm-actions button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-save-changes {
      background: #0079bf;
      color: white;
    }
    .btn-save-changes:hover {
      background: #026aa7;
      transform: translateY(-1px);
    }
    .btn-discard-changes {
      background: #6b778c;
      color: white;
    }
    .btn-discard-changes:hover {
      background: #5e6c84;
      transform: translateY(-1px);
    }
    .btn-cancel-close {
      background: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
    }
    .btn-cancel-close:hover {
      background: #e9ecef;
      transform: translateY(-1px);
    }
    .btn-delete-confirm {
      background: #dc3545;
      color: white;
    }
    .btn-delete-confirm:hover {
      background: #c82333;
      transform: translateY(-1px);
    }
    .btn-icon {
      margin-right: 6px;
      display: inline-block;
      vertical-align: middle;
    }

    /* Estilos para seção de comentários */
    .comments-section {
      margin-top: 25px;
      border-top: 1px solid #dfe1e6;
      padding-top: 20px;
    }
    .comments-section h3 {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #5e6c84;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    /* Botão adicionar comentário */
    .add-comment-btn {
      width: 100%;
      padding: 8px 12px;
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      color: #5e6c84;
      text-align: left;
      transition: all 0.2s ease;
      margin-bottom: 15px;
    }
    .add-comment-btn:hover {
      background: #e4e6ea;
      border-color: #c1c7d0;
    }
    .add-comment-btn.active {
      background: #fff;
      border-color: #0079bf;
      color: #172b4d;
    }
    
    /* Formulário de comentário */
    .comment-form {
      margin-bottom: 20px;
    }
    .comment-input {
      width: 100%;
      min-height: 80px;
      padding: 12px;
      border: 2px solid #dfe1e6;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }
    .comment-input:focus {
      outline: none;
      border-color: #0079bf;
    }
    .comment-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .btn-save-comment, .btn-cancel-comment {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .btn-save-comment {
      background: #0079bf;
      color: white;
    }
    .btn-save-comment:hover:not(:disabled) {
      background: #026aa7;
    }
    .btn-save-comment:disabled {
      background: #c1c7d0;
      cursor: not-allowed;
    }
    .btn-cancel-comment {
      background: #f4f5f7;
      color: #5e6c84;
    }
    .btn-cancel-comment:hover {
      background: #e4e6ea;
    }
    
    /* Lista de comentários */
    .comments-list {
      /* Removido max-height e overflow-y para usar scrollbar única da lateral direita */
    }
    .comment-item {
      margin-bottom: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #dfe1e6;
      transition: all 0.2s ease;
    }
    .comment-item:hover {
      background: #f4f5f7;
      border-left-color: #0079bf;
    }
    .comment-item.editing {
      background: #fff;
      border: 2px solid #0079bf;
      border-left: 3px solid #0079bf;
    }
    
    /* Visualização do comentário */
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .comment-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .comment-buttons {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    .comment-item:hover .comment-buttons {
      opacity: 1;
    }
    
    .comment-action-btn {
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }
    
    .comment-action-btn:hover {
      background-color: #f0f0f0;
    }
    
    .comment-action-btn.delete:hover {
      background-color: #ffebee;
    }
    
    /* Modal de comentário expandido */
    .expanded-comment-modal {
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .expanded-comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }
    
    .expanded-comment-header h3 {
      margin: 0;
      color: #172b4d;
      font-size: 18px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }
    
    .close-btn:hover {
      background-color: #f0f0f0;
    }
    
    .expanded-comment-body {
      margin-bottom: 20px;
    }
    
    .expanded-comment-author {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .expanded-comment-author strong {
      color: #172b4d;
      font-size: 14px;
    }
    
    .expanded-comment-date {
      color: #6b778c;
      font-size: 12px;
    }
    
    .expanded-comment-content {
      font-size: 14px;
      line-height: 1.6;
      color: #172b4d;
      padding: 16px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .expanded-comment-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    
    .btn-edit-expanded, .btn-delete-expanded {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .btn-edit-expanded {
      background: #0079bf;
      color: white;
    }
    
    .btn-edit-expanded:hover {
      background: #026aa7;
    }
    
    .btn-delete-expanded {
      background: #e74c3c;
      color: white;
    }
    
    .btn-delete-expanded:hover {
      background: #c0392b;
    }
    .comment-author {
      font-weight: 600;
      color: #172b4d;
      font-size: 12px;
    }
    .comment-date {
      font-size: 11px;
      color: #6b778c;
    }
    .comment-content {
      font-size: 13px;
      line-height: 1.4;
      color: #172b4d;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .comment-content:hover {
      color: #0079bf;
    }
    .comment-content.expandable {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    /* Edição do comentário */
    .comment-edit-input {
      width: 100%;
      min-height: 60px;
      padding: 8px;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .comment-edit-input:focus {
      outline: none;
      border-color: #0079bf;
    }
    .comment-edit-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .btn-save-edit, .btn-cancel-edit, .btn-delete-comment {
      padding: 4px 8px;
      border: none;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .btn-save-edit {
      background: #0079bf;
      color: white;
    }
    .btn-save-edit:hover {
      background: #026aa7;
    }
    .btn-cancel-edit {
      background: #f4f5f7;
      color: #5e6c84;
    }
    .btn-cancel-edit:hover {
      background: #e4e6ea;
    }
    .btn-delete-comment {
      background: #dc3545;
      color: white;
    }
    .btn-delete-comment:hover {
      background: #c82333;
    }
    
    /* Estado vazio */
    .no-comments {
      text-align: center;
      color: #6b778c;
      font-size: 13px;
      font-style: italic;
      padding: 20px;
    }

    /* ===== RESPONSIVIDADE PROFISSIONAL DO MODAL ===== */
    
    /* Estilos específicos para mobile drag and drop */
    @media (max-width: 768px) {
      .task-card {
        position: relative;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      
      .columns {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      .columns.dragging-active {
        overflow-x: hidden;
        touch-action: none;
      }
      
      .column {
        position: relative;
      }
      
      .column-content {
        min-height: 200px;
        position: relative;
      }
      
      .task-card.dragging {
        pointer-events: none;
      }
    }
    
    /* Mobile (até 425px) */
    @media (max-width: 425px) {
      .modal-content {
        width: 90%;
        margin: 4vh auto;
        min-width: unset;
        height: auto;
        max-height: 92vh;
        overflow-y: auto;
      }
      
      .modal-body {
        flex-direction: column;
        position: relative;
        overflow: visible;
      }
      
      .left-column {
        width: 100%;
        padding: 16px;
        border-right: none;
        border-bottom: 1px solid #eee;
        margin-bottom: 0;
      }
      
      .right-column {
        width: 100%;
        padding: 16px;
        background: white;
        position: relative;
        top: auto;
        right: auto;
        height: auto;
        z-index: auto;
        transition: none;
        overflow: visible;
        border-radius: 0;
        box-shadow: none;
        align-self: auto;
        flex: none;
      }
    }
    
    /* Ocultar botões mobile apenas no mobile (coluna única) */
    @media (max-width: 425px) {
      .mobile-toggle-btn,
      .mobile-close-btn {
        display: none;
      }
    }
    
    /* Ocultar botões mobile em telas maiores */
    @media (min-width: 426px) {
      .mobile-toggle-btn,
      .mobile-close-btn {
        display: none;
      }
    }
    
    /* Large screens and below (1024px and down) */
    @media (max-width: 1024px) {
      .header-section h2 {
        font-size: 15px;
        padding: 6px;
        padding-left: 12px;
        padding-right: 12px;
      }
    }
    
    /* Large Desktop (1200px+) */
    @media (min-width: 1200px) {
      .modal-content {
        width: 85%;
        max-width: 1000px;
        margin: 8vh auto;
      }
    }
    
    /* Desktop (992px - 1199px) */
    @media (max-width: 1199px) and (min-width: 992px) {
      .modal-content {
        width: 90%;
        max-width: 1000px;
        margin: 6vh auto;
      }
    }
    
    /* Tablet Landscape (768px - 991px) */
    @media (max-width: 991px) and (min-width: 768px) {
      .modal-content {
        width: 85%;
        margin: 4vh auto;
        min-width: 700px;
      }
    }
    
    /* Tablet Portrait (426px - 767px) */
    @media (max-width: 767px) and (min-width: 426px) {
      .modal-content {
        width: 90%;
        margin: 3vh auto;
        min-width: 400px;
      }
    }
  `],
  host: {
    '(document:load)': 'disablePageScroll()'
  }
})
export class KanbanComponent implements OnInit {
  tasks: Task[] = [];
  
  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.NONE,
    projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
  };
  
  draggedTask: Task | null = null;
  editingTask: Task | null = null;
  
  // ENTERPRISE DRAG PROPERTIES: ID-based com detecção de posição
  draggedColumn: ColumnData & { index: number } | null = null;
  dragOverColumnIndex: number = -1;
  dropPosition: 'left' | 'right' | null = null; // Detecta lado do drop
  insertIndex: number = -1; // Índice real de inserção
  editForm = {
    title: '',
    description: ''
  };
  showModal = false;
  modalTask: Task | null = null;
  descriptionTruncated = true;
  isSelecting = false;
  
  
  // Propriedades para adicionar cartão estilo Trello
  addingToColumn: { [key: string]: boolean } = {};
  newCardTitle: { [key: string]: string } = {};
  
  // Propriedades para adicionar coluna
  addingColumn = false;
  newColumnTitle = '';
  
  // ENTERPRISE ARCHITECTURE: Single source of truth para colunas
  private _columns: ColumnData[] = [];
  
  // Propriedades para dropdown de prioridade
  showPriorityDropdown = false;
  priorityOptions = [
    { value: TaskPriority.NONE, label: 'Sem prioridade' },
    { value: TaskPriority.LOW, label: 'Baixa' },
    { value: TaskPriority.MEDIUM, label: 'Média' },
    { value: TaskPriority.HIGH, label: 'Alta' }
  ];
  
  // Propriedades para dropdown de status
  showStatusDropdown = false;
  statusOptions = [
    { value: TaskStatus.PENDING, label: 'Pendente' },
    { value: TaskStatus.IN_PROGRESS, label: 'Em Progresso' },
    { value: TaskStatus.TESTING, label: 'Teste' },
    { value: TaskStatus.DONE, label: 'Concluído' }
  ];
  
  // Propriedades para lixeira drag and drop
  isDragOverTrash = false;
  
  // Propriedades para confirmação de alterações
  hasUnsavedChanges = false;
  showSaveConfirmModal = false;
  originalEditForm = { title: '', description: '' };
  
  // Propriedades para confirmação de exclusão
  showDeleteConfirmModal = false;
  taskToDeleteId: string | null = null;

  // Propriedades para comentários
  taskComments: Comment[] = [];
  showAddComment = false;
  newCommentContent = '';
  editingCommentId: string | null = null;
  editingCommentContent = '';
  expandedComment: Comment | null = null;

  // Propriedade para controle mobile (mantida para futuro uso)
  showMobilePanel = false;
  
  // Propriedades para touch/drag mobile
  touchStartX = 0;
  touchStartY = 0;
  currentTouchTask: Task | null = null;
  isDraggingTouch = false;
  autoScrollInterval: any = null;


  constructor(
    private taskService: TaskService,
    private commentService: CommentService
  ) {}

  ngOnInit(): void {
    this.initializeColumns();
    this.loadSavedColumns();
    this.loadTasks();
  }


  // ENTERPRISE METHOD: Inicialização das colunas padrão
  private initializeColumns(): void {
    this._columns = [
      {
        id: 'pending',
        status: 'pending',
        label: this.getStatusLabel(TaskStatus.PENDING),
        type: 'standard',
        order: 0
      },
      {
        id: 'in_progress',
        status: 'in_progress',
        label: this.getStatusLabel(TaskStatus.IN_PROGRESS),
        type: 'standard',
        order: 1
      },
      {
        id: 'testing',
        status: 'testing',
        label: this.getStatusLabel(TaskStatus.TESTING),
        type: 'standard',
        order: 2
      },
      {
        id: 'done',
        status: 'done',
        label: this.getStatusLabel(TaskStatus.DONE),
        type: 'standard',
        order: 3
      }
    ];
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (response) => {
        this.tasks = response.data || response;
        this.loadCustomTasks(); // Carrega tarefas customizadas
        console.log('Tasks loaded:', this.tasks);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.tasks = [];
      }
    });
  }

  /**
   * BUSINESS LOGIC: Retorna tarefas filtradas por status com ordenação por prioridade
   * Implementa ordenação decrescente (alta -> baixa) para exibir tarefas importantes primeiro
   * TODO: Considerar adicionar ordenação secundária por data de criação
   */
  getTasksByStatus(status: TaskStatus | string): Task[] {
    return this.tasks
      .filter(task => task.status === status)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Prioridade alta (3) primeiro
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
      [TaskPriority.NONE]: 'Sem prioridade',
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
        description: this.editForm.description,
        priority: this.editingTask.priority,
        status: this.editingTask.status
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
      this.deleteTaskAndCloseModal(taskId);
    }
  }

  private resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: TaskPriority.NONE,
      projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
    };
  }

  onDragStart(task: Task): void {
    this.draggedTask = task;
  }

  onDragEnd(): void {
    this.draggedTask = null;
    // Remove highlight de todas as colunas
    document.querySelectorAll('.column-content').forEach(col => {
      col.classList.remove('drag-over');
    });
  }

  // ENTERPRISE DRAG METHODS: Baseados em ID, não em índice
  onColumnDragStart(event: DragEvent, columnId: string, index: number): void {
    event.stopPropagation();
    const column = this._columns.find(col => col.id === columnId);
    if (!column) return;
    
    this.draggedColumn = { ...column, index };
    console.log('🚀 ENTERPRISE DRAG START:', { 
      columnId, 
      index, 
      column,
      allColumns: this.columns.map((col, i) => ({ i, id: col.id, status: col.status, order: col.order }))
    });
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', columnId);
    }
  }

  onColumnDragOver(event: DragEvent, targetColumnId: string, targetIndex: number): void {
    if (this.draggedColumn && this.draggedColumn.id !== targetColumnId) {
      event.preventDefault();
      event.stopPropagation();
      this.dragOverColumnIndex = targetIndex;
      
      // 🎯 DETECÇÃO INTELIGENTE DE POSIÇÃO PARA GHOST COLUMN
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = event.clientX;
      const centerX = rect.left + rect.width / 2;
      
      // Detecta se mouse está na metade esquerda ou direita
      this.dropPosition = mouseX < centerX ? 'left' : 'right';
      this.insertIndex = this.dropPosition === 'left' ? targetIndex : targetIndex + 1;
      
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  onColumnDragLeave(): void {
    this.dragOverColumnIndex = -1;
    this.dropPosition = null;
    this.insertIndex = -1;
  }

  onColumnDrop(event: DragEvent, targetColumnId: string, targetIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.draggedColumn || this.draggedColumn.id === targetColumnId) {
      this.cleanupDragState();
      return;
    }

    console.log('🎯 ENTERPRISE DROP:', { 
      from: { id: this.draggedColumn.id, order: this.draggedColumn.order },
      to: { id: targetColumnId, index: targetIndex },
      insertIndex: this.insertIndex,
      dropPosition: this.dropPosition
    });

    // ENTERPRISE LOGIC: Reordenação baseada em order, não em splice
    this.reorderColumns(this.draggedColumn.id, this.insertIndex >= 0 ? this.insertIndex : targetIndex);
    this.saveColumns();
    
    this.cleanupDragState();
  }

  private reorderColumns(draggedId: string, targetIndex: number): void {
    const sortedColumns = this.columns;
    const draggedColumn = sortedColumns.find(col => col.id === draggedId);
    if (!draggedColumn) return;

    // Remove da posição atual e reordena
    const columnsWithoutDragged = this._columns.filter(col => col.id !== draggedId);
    
    // Recalcula orders
    columnsWithoutDragged.forEach((col, index) => {
      if (index >= targetIndex) {
        col.order = index + 1;
      } else {
        col.order = index;
      }
    });
    
    // Insere na nova posição
    draggedColumn.order = targetIndex;
    
    console.log('✨ Reordered columns:', this.columns.map(col => ({ id: col.id, order: col.order })));
  }

  private cleanupDragState(): void {
    this.draggedColumn = null;
    this.dragOverColumnIndex = -1;
    this.dropPosition = null;
    this.insertIndex = -1;
  }

  onColumnDragEnd(): void {
    this.cleanupDragState();
  }

  // 👻 GHOST ANIMATION: Determina quando mostrar indicador visual de inserção
  shouldShowGhost(columnIndex: number, side: 'left' | 'right'): boolean {
    if (!this.draggedColumn || this.insertIndex === -1 || this.dropPosition === null) {
      return false;
    }

    // Não mostra ghost se é a própria coluna sendo arrastada
    const currentColumn = this.columns[columnIndex];
    if (currentColumn && currentColumn.id === this.draggedColumn.id) {
      return false;
    }

    // Mostra ghost baseado na posição detectada
    if (side === 'left') {
      return this.insertIndex === columnIndex && this.dropPosition === 'left';
    } else {
      return this.insertIndex === columnIndex + 1 && this.dropPosition === 'right';
    }
  }
  
  // Métodos para touch/drag no mobile
  onTouchStart(event: TouchEvent, task: Task): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.currentTouchTask = task;
    this.isDraggingTouch = false;
    
    // Ativa drag imediatamente após movimento mínimo
    this.isDraggingTouch = true;
    const element = event.target as HTMLElement;
    
    // Desabilita scroll horizontal durante drag
    const columnsElement = document.querySelector('.columns');
    if (columnsElement) {
      columnsElement.classList.add('dragging-active');
    }
  }
  
  onTouchMove(event: TouchEvent): void {
    if (!this.currentTouchTask || !this.isDraggingTouch) return;
    
    event.preventDefault();
    event.stopPropagation();
    const touch = event.touches[0];
    const moveX = touch.clientX - this.touchStartX;
    const moveY = touch.clientY - this.touchStartY;
    
    // Aplica transformação imediatamente
    const element = event.currentTarget as HTMLElement;
    element.classList.add('dragging');
    element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    element.style.zIndex = '9999';
    element.style.position = 'relative';
    
    // Auto-scroll nas bordas
    this.handleAutoScroll(touch.clientX);
    
    // Detecção baseada na posição do dedo
    element.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    element.style.pointerEvents = '';
    
    if (elementBelow) {
      // Remove highlight de todas as colunas
      document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
      });
      
      // Procura coluna mais próxima
      const column = elementBelow.closest('.column');
      if (column) {
        const columnContent = column.querySelector('.column-content');
        if (columnContent) {
          columnContent.classList.add('drag-over');
        }
      }
    }
  }
  
  onTouchEnd(event: TouchEvent, originalStatus: TaskStatus | string): void {
    // Para auto-scroll
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    
    // Reabilita scroll horizontal
    const columnsElement = document.querySelector('.columns');
    if (columnsElement) {
      columnsElement.classList.remove('dragging-active');
    }
    
    // Remove highlight de todas as colunas
    document.querySelectorAll('.column-content').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Limpa estilos do elemento
    const element = event.currentTarget as HTMLElement;
    element.classList.remove('dragging');
    element.style.transform = '';
    element.style.zIndex = '';
    element.style.position = '';
    element.style.pointerEvents = '';
    
    if (!this.currentTouchTask || !this.isDraggingTouch) {
      // Se não estava arrastando, abre o modal
      if (this.currentTouchTask && !this.isDraggingTouch) {
        this.openTaskModal(this.currentTouchTask);
      }
      this.currentTouchTask = null;
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Detecta coluna baseada na posição do dedo
    const touch = event.changedTouches[0];
    
    // Torna elemento invisível para detecção
    element.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    element.style.pointerEvents = '';
    
    if (elementBelow) {
      const column = elementBelow.closest('.column');
      
      if (column) {
        const allColumns = document.querySelectorAll('.column');
        let targetIndex = -1;
        
        allColumns.forEach((col, index) => {
          if (col === column) {
            targetIndex = index;
          }
        });
        
        if (targetIndex >= 0 && targetIndex < this.statuses.length) {
          const targetStatus = this.statuses[targetIndex];
          
          if (targetStatus !== originalStatus) {
            this.moveTaskToStatus(this.currentTouchTask, targetStatus);
            
            // Vibração curta de confirmação
            if ('vibrate' in navigator) {
              navigator.vibrate(20);
            }
          }
        }
      }
    }
    
    this.currentTouchTask = null;
    this.isDraggingTouch = false;
  }

  // Handlers para TaskCard component
  handleTaskTouchStart(data: {event: TouchEvent, task: Task}): void {
    this.onTouchStart(data.event, data.task);
  }

  handleTaskTouchEnd(data: {event: TouchEvent, task: Task, status?: string}): void {
    const status = data.status || 'pending';
    this.onTouchEnd(data.event, status);
  }
  
  // Método para auto-scroll nas bordas
  private handleAutoScroll(clientX: number): void {
    const columnsElement = document.querySelector('.columns') as HTMLElement;
    if (!columnsElement) return;
    
    const rect = columnsElement.getBoundingClientRect();
    const scrollZone = 50; // Área de 50px nas bordas para ativar scroll
    const scrollSpeed = 10; // Velocidade do scroll
    
    // Para scroll anterior se existir
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    
    // Scroll para esquerda
    if (clientX < rect.left + scrollZone) {
      this.autoScrollInterval = setInterval(() => {
        columnsElement.scrollLeft -= scrollSpeed;
      }, 30);
    }
    // Scroll para direita
    else if (clientX > rect.right - scrollZone) {
      this.autoScrollInterval = setInterval(() => {
        columnsElement.scrollLeft += scrollSpeed;
      }, 30);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    
    // Adiciona highlight visual na coluna
    const columnContent = (event.currentTarget as HTMLElement);
    if (columnContent && columnContent.classList.contains('column-content')) {
      // Remove highlight de todas as colunas
      document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
      });
      // Adiciona highlight na coluna atual
      columnContent.classList.add('drag-over');
    }
  }

  onDrop(event: DragEvent, newStatus: TaskStatus | string): void {
    event.preventDefault();
    
    // Remove highlight de todas as colunas
    document.querySelectorAll('.column-content').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    if (!this.draggedTask || this.draggedTask.status === newStatus) {
      this.draggedTask = null;
      return;
    }

    const oldTask = { ...this.draggedTask };
    const oldStatus = oldTask.status;
    
    // Atualização instantânea local
    const index = this.tasks.findIndex(t => t.id === oldTask.id);
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        status: newStatus as any,
        updatedAt: new Date()
      };
    }
    
    // Limpa o estado de drag imediatamente
    this.draggedTask = null;

    // Só atualiza no servidor se for status padrão
    if (Object.values(TaskStatus).includes(newStatus as TaskStatus)) {
      this.taskService.updateTask(oldTask.id, { 
        status: newStatus as any,
        priority: oldTask.priority
      }).subscribe({
        next: (updatedTask) => {
          // Sincroniza silenciosamente com o servidor
          const currentIndex = this.tasks.findIndex(t => t.id === updatedTask.id);
          if (currentIndex !== -1) {
            this.tasks[currentIndex] = updatedTask;
          }
        },
        error: (error) => {
          console.error('Error updating task status:', error);
          // Reverte apenas em caso de erro
          const currentIndex = this.tasks.findIndex(t => t.id === oldTask.id);
          if (currentIndex !== -1) {
            this.tasks[currentIndex] = {
              ...this.tasks[currentIndex],
              status: oldStatus
            };
          }
          // Notifica o usuário sobre o erro
          alert('Erro ao mover tarefa. A alteração foi revertida.');
        }
      });
    } else {
      // Para colunas customizadas, apenas mantém local
      console.log('Task moved to custom column:', newStatus);
      this.saveTasksToStorage(); // Salva tarefas customizadas
    }
  }

  openTaskModal(task: Task): void {
    this.modalTask = task;
    this.showModal = true;
    this.editingTask = null;
    this.descriptionTruncated = true;
    this.loadTaskComments(task.id);
    this.resetCommentState();
  }

  closeModal(): void {
    // Se está editando e tem mudanças não salvas, mostra confirmação
    if (this.editingTask && this.hasUnsavedChanges) {
      this.showSaveConfirmModal = true;
      return;
    }
    
    // Fecha normalmente se não há mudanças
    this.forceCloseModal();
  }

  private forceCloseModal(): void {
    this.showModal = false;
    this.modalTask = null;
    this.editingTask = null;
    this.showPriorityDropdown = false;
    this.showStatusDropdown = false;
    this.hasUnsavedChanges = false;
    this.showSaveConfirmModal = false;
    this.showDeleteConfirmModal = false;
    this.taskToDeleteId = null;
    this.showMobilePanel = false;
  }

  startEdit(): void {
    if (!this.modalTask) return;
    this.editingTask = this.modalTask;
    this.editForm = {
      title: this.modalTask.title,
      description: this.modalTask.description
    };
    // Salva estado original para comparação
    this.originalEditForm = {
      title: this.modalTask.title,
      description: this.modalTask.description
    };
    this.hasUnsavedChanges = false;
    
    // Auto-resize textareas após o Angular renderizar
    setTimeout(() => {
      const titleTextarea = document.querySelector('.title-edit-input') as HTMLTextAreaElement;
      const descTextarea = document.querySelector('.description-edit-input') as HTMLTextAreaElement;
      
      if (titleTextarea) this.autoResize({ target: titleTextarea });
      if (descTextarea) this.autoResize({ target: descTextarea });
    }, 0);
  }

  saveModalEdit(): void {
    if (!this.editingTask || !this.modalTask) return;
    
    const hasChanges = this.editForm.title !== this.editingTask.title || 
                      this.editForm.description !== this.editingTask.description;
    
    if (hasChanges && this.editForm.title.trim()) {
      const taskId = this.editingTask.id; // Salvar o ID antes da chamada assíncrona
      
      this.taskService.updateTask(taskId, {
        title: this.editForm.title,
        description: this.editForm.description,
        priority: this.editingTask.priority,
        status: this.editingTask.status
      }).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === taskId);
          if (index !== -1) this.tasks[index] = updatedTask;
          this.modalTask = updatedTask;
          this.editingTask = null;
          this.hasUnsavedChanges = false;
        },
        error: (error) => {
          console.error('Error updating task:', error);
          this.editingTask = null;
        }
      });
    } else {
      this.editingTask = null;
      this.hasUnsavedChanges = false;
    }
  }

  cancelModalEdit(): void {
    this.editingTask = null;
  }

  shouldShowDescriptionToggle(): boolean {
    if (!this.modalTask?.description) return false;
    const lines = this.modalTask.description.split('\n').length;
    return lines > 15;
  }

  toggleDescription(): void {
    this.descriptionTruncated = !this.descriptionTruncated;
  }

  /**
   * UI INTERACTION: Detecção de clique fora do modal para fechamento
   * Implementa padrão click-outside-to-close com prevenção de fechamento acidental
   */
  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.isSelecting = true; // Marca início da seleção no overlay
    }
  }

  /**
   * UI INTERACTION: Completa a detecção de click-outside
   * Só fecha o modal se mousedown E mouseup foram no mesmo overlay (evita arrastar)
   */
  onOverlayMouseUp(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.isSelecting) {
      this.closeModal();
    }
    this.isSelecting = false;
  }

  autoResize(event: any): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Métodos para adicionar cartão estilo Trello
  startAddingCard(status: TaskStatus | string): void {
    this.addingToColumn[status] = true;
    this.newCardTitle[status] = '';
    // Focus no textarea após o Angular renderizar
    setTimeout(() => {
      const textarea = document.querySelector('.card-title-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    });
  }

  cancelAddCard(status: TaskStatus | string): void {
    this.addingToColumn[status] = false;
    this.newCardTitle[status] = '';
  }

  confirmAddCard(status: TaskStatus | string): void {
    const title = this.newCardTitle[status]?.trim();
    if (!title) return;

    const taskData: CreateTaskRequest = {
      title: title,
      description: '', // Descrição vazia inicialmente
      priority: TaskPriority.NONE,
      projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
    };

    this.taskService.createTask(taskData).subscribe({
      next: (task) => {
        // Para colunas customizadas, criar nova task com status customizado
        if (typeof status === 'string' && !Object.values(TaskStatus).includes(status as TaskStatus)) {
          const customTask = { ...task, status: status as any };
          this.tasks.push(customTask);
        } else {
          this.tasks.push(task);
          // Move para o status correto se necessário
          if (task.status !== status && Object.values(TaskStatus).includes(status as TaskStatus)) {
            this.moveTaskToStatus(task, status as TaskStatus);
          }
        }
        
        this.saveTasksToStorage(); // Salva tarefas customizadas
        this.cancelAddCard(status);
      },
      error: (error) => {
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  onCardTitleKeydown(event: KeyboardEvent, status: TaskStatus | string): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.confirmAddCard(status);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelAddCard(status);
    }
  }

  private moveTaskToStatus(task: Task, newStatus: TaskStatus): void {
    const oldStatus = task.status;
    
    // Atualização instantânea local
    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        status: newStatus as any,
        updatedAt: new Date()
      };
    }
    
    // Se está no modal, atualiza também
    if (this.modalTask && this.modalTask.id === task.id) {
      this.modalTask = {
        ...this.modalTask,
        status: newStatus
      };
    }

    // Atualiza no servidor em background
    const updateData: UpdateTaskRequest = {
      status: newStatus as any,
      priority: task.priority
    };

    this.taskService.updateTask(task.id, updateData).subscribe({
      next: (updatedTask) => {
        // Sincroniza silenciosamente
        const currentIndex = this.tasks.findIndex(t => t.id === task.id);
        if (currentIndex !== -1) {
          this.tasks[currentIndex] = updatedTask;
        }
        if (this.modalTask && this.modalTask.id === updatedTask.id) {
          this.modalTask = updatedTask;
        }
      },
      error: (error) => {
        console.error('Erro ao mover tarefa:', error);
        // Reverte em caso de erro
        const currentIndex = this.tasks.findIndex(t => t.id === task.id);
        if (currentIndex !== -1) {
          this.tasks[currentIndex] = {
            ...this.tasks[currentIndex],
            status: oldStatus
          };
        }
        if (this.modalTask && this.modalTask.id === task.id) {
          this.modalTask = {
            ...this.modalTask,
            status: oldStatus
          };
        }
      }
    });
  }

  // Métodos para dropdown de prioridade
  togglePriorityDropdown(): void {
    this.showPriorityDropdown = !this.showPriorityDropdown;
    this.showStatusDropdown = false; // Fecha o dropdown de status
  }
  
  // Métodos para dropdown de status
  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
    this.showPriorityDropdown = false; // Fecha o dropdown de prioridade
  }

  changePriority(newPriority: TaskPriority): void {
    if (!this.modalTask) return;

    // Atualização instantânea local para melhor UX
    const oldPriority = this.modalTask.priority;
    
    // Atualiza imediatamente na interface
    this.modalTask = { ...this.modalTask, priority: newPriority };
    const taskIndex = this.tasks.findIndex(t => t.id === this.modalTask!.id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], priority: newPriority };
    }
    
    // Fecha o dropdown imediatamente
    this.showPriorityDropdown = false;

    // Envia para o servidor em background
    const updateData: UpdateTaskRequest = {
      priority: newPriority,
      status: this.modalTask.status
    };

    this.taskService.updateTask(this.modalTask.id, updateData).subscribe({
      next: (updatedTask) => {
        // Sincroniza com resposta do servidor (caso haja diferenças)
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = updatedTask;
        }
        if (this.modalTask && this.modalTask.id === updatedTask.id) {
          this.modalTask = updatedTask;
        }
      },
      error: (error) => {
        console.error('Erro ao atualizar prioridade:', error);
        // Reverte a mudança em caso de erro
        if (this.modalTask) {
          this.modalTask = { ...this.modalTask, priority: oldPriority };
        }
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = { ...this.tasks[taskIndex], priority: oldPriority };
        }
      }
    });
  }
  
  changeStatus(newStatus: TaskStatus): void {
    if (!this.modalTask) return;

    // Atualização instantânea local para melhor UX
    const oldStatus = this.modalTask.status;
    
    // Atualiza imediatamente na interface
    this.modalTask = { ...this.modalTask, status: newStatus };
    const taskIndex = this.tasks.findIndex(t => t.id === this.modalTask!.id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], status: newStatus };
    }
    
    // Fecha o dropdown imediatamente
    this.showStatusDropdown = false;

    // Envia para o servidor em background
    const updateData: UpdateTaskRequest = {
      status: newStatus as any,
      priority: this.modalTask.priority
    };

    this.taskService.updateTask(this.modalTask.id, updateData).subscribe({
      next: (updatedTask) => {
        // Sincroniza com resposta do servidor (caso haja diferenças)
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = updatedTask;
        }
        if (this.modalTask && this.modalTask.id === updatedTask.id) {
          this.modalTask = updatedTask;
        }
      },
      error: (error) => {
        console.error('Erro ao atualizar status:', error);
        // Reverte a mudança em caso de erro
        if (this.modalTask) {
          this.modalTask = { ...this.modalTask, status: oldStatus };
        }
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = { ...this.tasks[taskIndex], status: oldStatus };
        }
      }
    });
  }

  // Métodos para lixeira drag and drop
  onTrashDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOverTrash = true;
  }

  onTrashDragLeave(event: DragEvent): void {
    this.isDragOverTrash = false;
  }

  onTrashDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOverTrash = false;
    
    if (this.draggedTask) {
      this.deleteTaskAndCloseModal(this.draggedTask.id);
    }
  }

  private deleteTaskAndCloseModal(taskId: string): void {
    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        // Remove da lista local
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        
        // Fecha modal se a task deletada estava aberta
        if (this.modalTask && this.modalTask.id === taskId) {
          this.closeModal();
        }
        
        console.log('Tarefa deletada com sucesso');
      },
      error: (error) => {
        console.error('Erro ao deletar tarefa:', error);
      }
    });
  }

  // Métodos para confirmação de alterações
  checkForChanges(): void {
    this.hasUnsavedChanges = 
      this.editForm.title !== this.originalEditForm.title ||
      this.editForm.description !== this.originalEditForm.description;
  }

  cancelSaveConfirm(): void {
    this.showSaveConfirmModal = false;
  }

  saveAndClose(): void {
    this.saveModalEdit();
    this.showSaveConfirmModal = false;
    this.forceCloseModal();
  }

  discardAndClose(): void {
    // Reverte as mudanças para o estado original
    this.editForm = { ...this.originalEditForm };
    this.hasUnsavedChanges = false;
    this.showSaveConfirmModal = false;
    this.forceCloseModal();
  }

  // Métodos para confirmação de exclusão
  showDeleteConfirm(taskId: string): void {
    this.taskToDeleteId = taskId;
    this.showDeleteConfirmModal = true;
  }

  cancelDeleteConfirm(): void {
    this.showDeleteConfirmModal = false;
    this.taskToDeleteId = null;
  }

  confirmDelete(): void {
    if (this.taskToDeleteId) {
      this.deleteTaskAndCloseModal(this.taskToDeleteId);
      this.showDeleteConfirmModal = false;
      this.taskToDeleteId = null;
    }
  }

  // ===== MÉTODOS DE COMENTÁRIOS =====

  loadTaskComments(taskId: string): void {
    this.commentService.getCommentsByTask(taskId).subscribe({
      next: (comments) => {
        this.taskComments = comments;
      },
      error: (error) => {
        console.error('Erro ao carregar comentários:', error);
        this.taskComments = [];
      }
    });
  }

  resetCommentState(): void {
    this.showAddComment = false;
    this.newCommentContent = '';
    this.editingCommentId = null;
    this.editingCommentContent = '';
  }

  toggleAddComment(): void {
    this.showAddComment = !this.showAddComment;
    if (this.showAddComment) {
      this.newCommentContent = '';
      // Focus no textarea após renderização
      setTimeout(() => {
        const textarea = document.querySelector('.comment-input') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }, 100);
    }
  }

  saveComment(): void {
    if (!this.newCommentContent?.trim() || !this.modalTask) return;

    const commentData: CreateCommentRequest = {
      content: this.newCommentContent.trim()
    };

    this.commentService.createComment(this.modalTask.id, commentData).subscribe({
      next: (comment) => {
        this.taskComments.unshift(comment); // Adiciona no início da lista
        this.newCommentContent = '';
        this.showAddComment = false;
      },
      error: (error) => {
        console.error('Erro ao salvar comentário:', error);
      }
    });
  }

  cancelComment(): void {
    this.newCommentContent = '';
    this.showAddComment = false;
  }

  startEditComment(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
    // Focus no textarea após renderização
    setTimeout(() => {
      const textarea = document.querySelector('.comment-edit-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  saveEditComment(comment: Comment): void {
    if (!this.editingCommentContent?.trim()) return;

    const updateData: UpdateCommentRequest = {
      content: this.editingCommentContent.trim()
    };

    this.commentService.updateComment(comment.id, updateData).subscribe({
      next: (updatedComment) => {
        const index = this.taskComments.findIndex(c => c.id === comment.id);
        if (index !== -1) {
          this.taskComments[index] = updatedComment;
        }
        this.cancelEditComment();
      },
      error: (error) => {
        console.error('Erro ao atualizar comentário:', error);
      }
    });
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentContent = '';
  }

  deleteComment(commentId: string): void {
    if (confirm('Tem certeza que deseja excluir este comentário?')) {
      this.commentService.deleteComment(commentId).subscribe({
        next: () => {
          this.taskComments = this.taskComments.filter(c => c.id !== commentId);
          this.cancelEditComment();
        },
        error: (error) => {
          console.error('Erro ao excluir comentário:', error);
        }
      });
    }
  }

  // Auto-save ao sair do campo (blur)
  onCommentBlur(): void {
    // Implementar auto-save se necessário
    // Por enquanto, não faz nada
  }

  onEditCommentBlur(comment: Comment): void {
    // Auto-save ao sair do campo de edição
    setTimeout(() => {
      if (this.editingCommentId === comment.id && this.editingCommentContent?.trim()) {
        this.saveEditComment(comment);
      }
    }, 200); // Delay para permitir clique nos botões
  }

  // Tratamento de teclado
  onCommentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelComment();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      this.saveComment();
    }
  }

  onEditCommentKeydown(event: KeyboardEvent, comment: Comment): void {
    if (event.key === 'Escape') {
      this.cancelEditComment();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      this.saveEditComment(comment);
    }
  }

  // Utilitários
  trackComment(index: number, comment: Comment): string {
    return comment.id;
  }

  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    
    // Ajustar para horário brasileiro se necessário
    // O backend já envia em UTC-3, então comparamos com horário brasileiro
    const now = new Date();
    const brazilNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    const diffMs = brazilNow.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Se a diferença for negativa (comentário no futuro), é recente
    if (diffMins < 1 || diffMs < 0) return 'agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 30) return `${diffDays}d`;
    
    // Para comentários mais antigos, mostrar data
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  isCommentLong(content: string): boolean {
    return content.length > 100;
  }

  // Métodos para modal expandido
  expandComment(comment: Comment): void {
    this.expandedComment = comment;
  }

  closeExpandedComment(): void {
    this.expandedComment = null;
  }

  editFromExpanded(): void {
    if (this.expandedComment) {
      this.startEditComment(this.expandedComment);
      this.closeExpandedComment();
    }
  }

  deleteFromExpanded(): void {
    if (this.expandedComment) {
      this.deleteComment(this.expandedComment.id);
      this.closeExpandedComment();
    }
  }

  // Métodos para controle do painel mobile (mantidos para compatibilidade)
  toggleMobilePanel(): void {
    this.showMobilePanel = !this.showMobilePanel;
  }

  closeMobilePanel(): void {
    this.showMobilePanel = false;
  }

  // Métodos para adicionar coluna
  startAddingColumn(): void {
    this.addingColumn = true;
    this.newColumnTitle = '';
    setTimeout(() => {
      const input = document.querySelector('.column-title-input') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    });
  }

  cancelAddColumn(): void {
    this.addingColumn = false;
    this.newColumnTitle = '';
  }

  confirmAddColumn(): void {
    const title = this.newColumnTitle.trim();
    if (!title) return;

    // ENTERPRISE: Adiciona nova coluna ao final
    const maxOrder = Math.max(...this._columns.map(col => col.order), -1);
    const newColumn: ColumnData = {
      id: `custom_${Date.now()}`,
      status: `custom_${Date.now()}`,
      label: title,
      type: 'custom',
      order: maxOrder + 1
    };
    
    this._columns.push(newColumn);
    this.saveColumns();
    this.cancelAddColumn();
  }

  // ENTERPRISE PERSISTENCE: Single source of truth
  private saveColumns(): void {
    try {
      localStorage.setItem('kanban_columns_enterprise', JSON.stringify(this._columns));
      console.log('💾 Columns saved:', this._columns.map(col => ({ id: col.id, order: col.order })));
    } catch (error) {
      console.error('Erro ao salvar colunas:', error);
    }
  }

  private loadSavedColumns(): void {
    try {
      const savedColumns = localStorage.getItem('kanban_columns_enterprise');
      if (savedColumns) {
        const loadedColumns: ColumnData[] = JSON.parse(savedColumns);
        
        // Mescla com colunas padrão, preservando customizações
        loadedColumns.forEach(savedCol => {
          const existingCol = this._columns.find(col => col.id === savedCol.id);
          if (existingCol) {
            // Atualiza ordem da coluna padrão
            existingCol.order = savedCol.order;
          } else {
            // Adiciona coluna customizada
            this._columns.push(savedCol);
          }
        });
        
        console.log('📂 Columns loaded:', this._columns.map(col => ({ id: col.id, order: col.order })));
      }
    } catch (error) {
      console.error('Erro ao carregar colunas:', error);
    }
  }

  private saveTasksToStorage(): void {
    try {
      // Salva apenas tarefas com status customizado
      const customTasks = this.tasks.filter(task => 
        typeof task.status === 'string' && 
        !Object.values(TaskStatus).includes(task.status as TaskStatus)
      );
      localStorage.setItem('kanban_custom_tasks', JSON.stringify(customTasks));
    } catch (error) {
      console.error('Erro ao salvar tarefas customizadas:', error);
    }
  }

  private loadCustomTasks(): void {
    try {
      const savedCustomTasks = localStorage.getItem('kanban_custom_tasks');
      if (savedCustomTasks) {
        const customTasks = JSON.parse(savedCustomTasks);
        // Adiciona tarefas customizadas às tarefas carregadas do servidor
        this.tasks = [...this.tasks, ...customTasks];
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas customizadas:', error);
    }
  }

  onColumnTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmAddColumn();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelAddColumn();
    }
  }

  // ENTERPRISE GETTER: Reactive sem side effects
  get columns(): ColumnData[] {
    return [...this._columns].sort((a, b) => a.order - b.order);
  }

  // TrackBy function para otimização Angular
  trackByColumn(index: number, column: ColumnData): string {
    return column.id;
  }

  // ENTERPRISE COMPATIBILITY: Mantém compatibilidade com statuses antigos
  get statuses(): TaskStatus[] {
    return this._columns
      .filter(col => col.type === 'standard')
      .sort((a, b) => a.order - b.order)
      .map(col => col.status as TaskStatus);
  }

  get customColumns(): { status: string; label: string }[] {
    return this._columns
      .filter(col => col.type === 'custom')
      .sort((a, b) => a.order - b.order)
      .map(col => ({ status: col.status, label: col.label }));
  }

  // Método para obter tarefas por status (aceita string também)
  getTasksByStatusString(status: string): Task[] {
    return this.tasks
      .filter(task => task.status === status)
      .sort((a, b) => {
        // Ordenação por prioridade: Alta (2) -> Média (1) -> Baixa (0)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // Se prioridade igual, ordena por data de criação (mais recente primeiro)
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }

}