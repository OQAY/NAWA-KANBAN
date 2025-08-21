import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { CommentService } from '../../services/comment.service';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '../../models/comment.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kanban-board">
      <div class="header-section">
        <h2>Kanban Board</h2>
        <div class="trash-zone" 
             [class.drag-over]="isDragOverTrash"
             (dragover)="onTrashDragOver($event)"
             (dragleave)="onTrashDragLeave($event)"
             (drop)="onTrashDrop($event)">
          <span class="trash-icon">🗑️</span>
          <span class="trash-text">Arraste aqui para deletar</span>
        </div>
      </div>
      
      <div class="columns">
        <div class="column" *ngFor="let status of statuses">
          <div class="column-header">
            <h3>{{ getStatusLabel(status) }}</h3>
            <span class="task-count">{{ getTasksByStatus(status).length }}</span>
          </div>
          
          <div class="column-content"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event, status)">
            <div class="task-card" 
                 *ngFor="let task of getTasksByStatus(status)"
                 draggable="true"
                 (dragstart)="onDragStart(task)"
                 (dragend)="onDragEnd()"
                 (click)="openTaskModal(task)">
              <div class="task-content">
                <h4>{{ task.title }}</h4>
                <p>{{ task.description }}</p>
              </div>
              <div class="task-meta">
                <span class="priority priority-{{ task.priority }}">{{ getPriorityLabel(task.priority) }}</span>
              </div>
            </div>
            
            <div *ngIf="getTasksByStatus(status).length === 0" class="empty-column">
              Nenhuma tarefa
            </div>
            
            <!-- Botão adicionar cartão estilo Trello -->
            <div class="add-card-container">
              <div *ngIf="!addingToColumn[status]" class="add-card-btn" (click)="startAddingCard(status)">
                <span class="plus-icon">+</span>
                <span class="add-text">Adicionar um cartão</span>
              </div>
              
              <div *ngIf="addingToColumn[status]" class="add-card-form">
                <textarea 
                  [(ngModel)]="newCardTitle[status]"
                  placeholder="Insira um título para este cartão..."
                  class="card-title-input"
                  (keydown)="onCardTitleKeydown($event, status)"
                  #cardInput>
                </textarea>
                <div class="add-card-actions">
                  <button (click)="confirmAddCard(status)" class="btn-add-card">Adicionar cartão</button>
                  <button (click)="cancelAddCard(status)" class="btn-cancel-add">✕</button>
                </div>
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
                  <button (click)="deleteTask(modalTask!.id)" class="action-btn delete-btn">Excluir</button>
                  <button *ngIf="editingTask" (click)="saveModalEdit()" class="action-btn save-btn">Salvar</button>
                  <button *ngIf="editingTask" (click)="cancelModalEdit()" class="action-btn cancel-btn">Cancelar</button>
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
                  <span>{{ getStatusLabel(modalTask?.status!) }}</span>
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
                        <span class="comment-author">{{ comment.user?.name || 'Usuário' }}</span>
                        <span class="comment-date">{{ formatCommentDate(comment.createdAt) }}</span>
                      </div>
                      <div class="comment-content" 
                           (click)="startEditComment(comment)"
                           [class.expandable]="isCommentLong(comment.content)">
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
  `,
  styles: [`
    .kanban-board {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header-section h2 {
      margin: 0;
    }
    .trash-zone {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      background: #f9f9f9;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 200px;
      justify-content: center;
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
    .columns {
      display: flex;
      gap: 20px;
      margin-top: 20px;
      overflow-x: auto;
      padding-bottom: 10px;
    }
    .columns::-webkit-scrollbar {
      height: 8px;
    }
    .columns::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    .columns::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    .columns::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    .column {
      background: transparent;
      border-radius: 12px;
      width: 300px;
      min-width: 300px;
      flex-shrink: 0;
    }
    .column-header {
      background: #f1f2f4;
      padding: 12px 16px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e4e6ea;
    }
    .column-header h3 {
      margin: 0;
      font-size: 14px;
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
    .column-content {
      background: #f1f2f4;
      padding: 8px;
      border-radius: 0 0 12px 12px;
      min-height: 50px;
    }
    .task-card {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      border: 1px solid #dee2e6;
      cursor: grab;
      min-height: 100px;
      max-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .task-card:active {
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
      font-size: 14px;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-card p {
      margin: 0 0 8px 0;
      font-size: 12px;
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
      font-size: 14px;
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
      font-size: 14px;
      line-height: 20px;
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
      font-size: 14px;
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
      overflow: hidden;
    }
    .left-column {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      border-right: 1px solid #eee;
    }
    .right-column {
      width: 40%;
      padding: 20px;
      background: #f8f9fa;
      overflow-y: auto;
      overflow-x: hidden;
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
      background: #f4f5f7;
      color: #42526e;
    }
    .delete-btn:hover {
      background: #ffebe6;
      color: #de350b;
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
      background: linear-gradient(135deg, #ffc107, #ff9800);
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
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
      background: #28a745;
      color: white;
    }
    .btn-save-changes:hover {
      background: #218838;
      transform: translateY(-1px);
    }
    .btn-discard-changes {
      background: #dc3545;
      color: white;
    }
    .btn-discard-changes:hover {
      background: #c82333;
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
      max-height: 300px;
      overflow-y: auto;
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
  
  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.NONE,
    projectId: '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf'
  };
  
  draggedTask: Task | null = null;
  editingTask: Task | null = null;
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
  
  // Propriedades para dropdown de prioridade
  showPriorityDropdown = false;
  priorityOptions = [
    { value: TaskPriority.NONE, label: 'Sem prioridade' },
    { value: TaskPriority.LOW, label: 'Baixa' },
    { value: TaskPriority.MEDIUM, label: 'Média' },
    { value: TaskPriority.HIGH, label: 'Alta' }
  ];
  
  // Propriedades para lixeira drag and drop
  isDragOverTrash = false;
  
  // Propriedades para confirmação de alterações
  hasUnsavedChanges = false;
  showSaveConfirmModal = false;
  originalEditForm = { title: '', description: '' };

  // Propriedades para comentários
  taskComments: Comment[] = [];
  showAddComment = false;
  newCommentContent = '';
  editingCommentId: string | null = null;
  editingCommentContent = '';

  constructor(
    private taskService: TaskService,
    private commentService: CommentService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (response) => {
        this.tasks = response.data || response;
        console.log('Tasks loaded:', this.tasks);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.tasks = [];
      }
    });
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks
      .filter(task => task.status === status)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
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
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, newStatus: TaskStatus): void {
    event.preventDefault();
    
    if (!this.draggedTask || this.draggedTask.status === newStatus) {
      return;
    }

    const oldTask = this.draggedTask;
    
    // Atualizar localmente primeiro para feedback instantâneo
    const index = this.tasks.findIndex(t => t.id === oldTask.id);
    if (index !== -1) {
      this.tasks[index] = { 
        ...this.tasks[index], 
        status: newStatus,
        updatedAt: new Date()
      };
    }

    // Depois atualizar no servidor - preservar prioridade
    this.taskService.updateTask(oldTask.id, { 
      status: newStatus,
      priority: oldTask.priority
    }).subscribe({
      next: (updatedTask) => {
        console.log('Task updated from server:', updatedTask);
        console.log('Priority value:', updatedTask.priority, 'Type:', typeof updatedTask.priority);
        // Já foi atualizado localmente, só garantir que está sincronizado
        const currentIndex = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (currentIndex !== -1) this.tasks[currentIndex] = updatedTask;
        this.draggedTask = null;
      },
      error: (error) => {
        // Reverter mudança local em caso de erro
        const currentIndex = this.tasks.findIndex(t => t.id === oldTask.id);
        if (currentIndex !== -1) {
          this.tasks[currentIndex] = { ...this.tasks[currentIndex], status: oldTask.status };
        }
        console.error('Error updating task status:', error);
        this.draggedTask = null;
      }
    });
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
    this.hasUnsavedChanges = false;
    this.showSaveConfirmModal = false;
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
      this.taskService.updateTask(this.editingTask.id, {
        title: this.editForm.title,
        description: this.editForm.description,
        priority: this.editingTask.priority,
        status: this.editingTask.status
      }).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === this.editingTask!.id);
          if (index !== -1) this.tasks[index] = updatedTask;
          this.modalTask = updatedTask;
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

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.isSelecting = true;
    }
  }

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
  startAddingCard(status: TaskStatus): void {
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

  cancelAddCard(status: TaskStatus): void {
    this.addingToColumn[status] = false;
    this.newCardTitle[status] = '';
  }

  confirmAddCard(status: TaskStatus): void {
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
        this.tasks.push(task);
        // Move para o status correto se necessário
        if (task.status !== status) {
          this.moveTaskToStatus(task, status);
        }
        this.cancelAddCard(status);
      },
      error: (error) => {
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  onCardTitleKeydown(event: KeyboardEvent, status: TaskStatus): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.confirmAddCard(status);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelAddCard(status);
    }
  }

  private moveTaskToStatus(task: Task, newStatus: TaskStatus): void {
    const updateData: UpdateTaskRequest = {
      status: newStatus,
      priority: task.priority
    };

    this.taskService.updateTask(task.id, updateData).subscribe({
      next: (updatedTask) => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
        }
      },
      error: (error) => {
        console.error('Erro ao mover tarefa:', error);
      }
    });
  }

  // Métodos para dropdown de prioridade
  togglePriorityDropdown(): void {
    this.showPriorityDropdown = !this.showPriorityDropdown;
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isCommentLong(content: string): boolean {
    return content.length > 100;
  }
}