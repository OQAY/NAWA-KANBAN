import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { CommentService } from '../../services/comment.service';
import { ColumnService } from '../../services/column.service';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '../../models/comment.model';
import { ColumnManagementComponent } from '../../components/column-management/column-management.component';
import { TrashDropZoneComponent } from '../../components/trash-drop-zone/trash-drop-zone.component';

/**
 * ENTERPRISE ARCHITECTURE: Interface para estrutura unificada de colunas
 * Define a estrutura padrão para todas as colunas do sistema (padrão + customizadas)
 * - 'standard': Colunas pré-definidas do sistema (pending, in_progress, testing, done)
 * - 'custom': Colunas criadas dinamicamente pelo usuário
 * - 'order': Controla a sequência de exibição das colunas no board
 */
interface ColumnData {
  id: string;
  realId?: string; // UUID real da coluna no backend
  status: string; // Status sempre presente
  label: string;
  type: string; // Sempre 'normal' agora
  order: number; // Order sempre presente
  color?: string;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnManagementComponent, TrashDropZoneComponent],
  templateUrl: './kanban.component.html',
  styleUrl: './styles/index.scss'
  /* REFACTORED: Extracted inline template and styles to separate files
   * - kanban.component.html: ~400 lines of template code
   * - kanban.component.scss: ~1500 lines of styles  
   * This reduces the main component file from 3322 to ~400 lines
   * Phase 1 completed: Template and style extraction successful
   */
})
export class KanbanComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly DEFAULT_PROJECT_ID = '68a0ca52-1c9f-4ff2-9d12-e908f1cb53bf';
  
  tasks: Task[] = [];
  
  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.NONE,
    projectId: this.DEFAULT_PROJECT_ID
  };
  
  draggedTask: Task | null = null;
  editingTask: Task | null = null;
  
  // ENTERPRISE DRAG PROPERTIES: ID-based com detecção de posição
  draggedColumn: ColumnData & { index: number } | null = null;
  dragOverColumnIndex: number = -1;
  dropPosition: 'left' | 'right' | null = null; // Detecta lado do drop

  // TOUCH SUPPORT: Coordenadas para detecção de toque em dispositivos móveis
  touchStartX = 0;
  touchStartY = 0;
  currentTouchTask: Task | null = null;
  isDraggingTouch = false;

  // MODAL TASK: Tarefa atualmente aberta no modal
  modalTask: Task | null = null;
  showModal = false;
  editingTitle = false;
  editingDescription = false;
  isDescriptionExpanded = false;

  // COMMENTS: Sistema de comentários integrado
  taskComments: Comment[] = [];
  showAddComment = false;
  newCommentContent = '';
  editingComment: Comment | null = null;
  editingCommentId: string | null = null;
  editingCommentContent = '';

  // COLUMN MANAGEMENT: Gerenciamento dinâmico de colunas
  columns: ColumnData[] = [];
  // Column management moved to ColumnManagementComponent

  // ADD CARD STATES: Estados para adição rápida de cartões
  addingCard: { [key: string]: boolean } = {};
  newCardTitle: { [key: string]: string } = {};

  // SAVE STATE: Controle de salvamento
  hasUnsavedChanges = false;
  isSaving = false;

  // Propriedades para touch/drag mobile
  private autoScrollInterval: any = null;

  constructor(
    private taskService: TaskService,
    private commentService: CommentService,
    private columnService: ColumnService
  ) {}

  ngOnInit(): void {
    this.loadColumnsFromBackend();
    this.loadTasks();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions and timers to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  // ENTERPRISE ARCHITECTURE: Carrega colunas do backend
  private loadColumnsFromBackend(): void {
    this.columnService.getColumns().subscribe({
      next: (columns) => {
        this.columns = columns.map(col => ({
          id: col.status, // Use status as ID for compatibility
          realId: col.id, // Keep real UUID for backend operations
          status: col.status, // Add status field
          label: col.name,
          type: col.type,
          order: col.order, // Add order field
          color: this.getColumnColor(col.status)
        }));
      },
      error: (error) => {
        console.error('Erro ao carregar colunas:', error);
        this.initializeColumns(); // Fallback to default columns
      }
    });
  }

  private getColumnColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'pending': '#6366F1',
      'in_progress': '#3B82F6', 
      'testing': '#F59E0B',
      'done': '#10B981'
    };
    return colorMap[status] || '#8B5CF6'; // Default purple for custom columns
  }

  // ENTERPRISE ARCHITECTURE: Inicialização das colunas padrão + customizadas (fallback)
  private initializeColumns(): void {
    this.columns = [
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
      },
      ...this.loadSavedColumns()
    ];
  }

  loadTasks(): void {
    this.taskService.getTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
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

  // Método de utilidade para filtrar tarefas por status  
  getTasksByStatus(status: TaskStatus | string): Task[] {
    return this.tasks
      .filter(task => task.status === status)
      .sort((a, b) => b.priority - a.priority); // Ordena por prioridade: Alta → Baixa
  }

  // Método de utilidade para obter rótulo do status
  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING: return 'Pendente';
      case TaskStatus.IN_PROGRESS: return 'Em Progresso';
      case TaskStatus.TESTING: return 'Em Teste';
      case TaskStatus.DONE: return 'Concluído';
      default: return status;
    }
  }

  // Método de utilidade para obter rótulo da prioridade
  getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.NONE: return 'Sem Prioridade';
      case TaskPriority.LOW: return 'Baixa';
      case TaskPriority.MEDIUM: return 'Média';
      case TaskPriority.HIGH: return 'Alta';
      default: return 'Desconhecida';
    }
  }

  createTask(): void {
    if (!this.newTask.title.trim()) return;

    this.taskService.createTask(this.newTask).subscribe({
      next: (task) => {
        this.tasks.push(task);
        this.resetForm();
      },
      error: (error) => console.error('Error creating task:', error)
    });
  }

  editTask(task: Task): void {
    this.editingTask = { ...task };
  }

  saveEdit(): void {
    if (!this.editingTask || !this.editingTask.title.trim()) return;

    const updateRequest: UpdateTaskRequest = {
      title: this.editingTask.title,
      description: this.editingTask.description,
      priority: this.editingTask.priority
    };

    this.taskService.updateTask(this.editingTask.id, updateRequest).subscribe({
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
  }

  cancelEdit(): void {
    this.editingTask = null;
  }

  deleteTask(taskId: string): void {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
      },
      error: (error) => console.error('Error deleting task:', error)
    });
  }

  private resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: TaskPriority.NONE,
      projectId: this.DEFAULT_PROJECT_ID
    };
  }

  // DRAG & DROP: Lógica principal de arrastar e soltar tarefas
  onDragStart(task: Task): void {
    this.draggedTask = task;
  }

  onDragEnd(): void {
    this.draggedTask = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, status: string): void {
    event.preventDefault();
    
    if (!this.draggedTask) return;

    const updateRequest: UpdateTaskRequest = {
      status: status as TaskStatus
    };

    const currentIndex = this.tasks.findIndex(t => t.id === this.draggedTask!.id);
    
    // Atualiza localmente primeiro para UX responsiva
    if (currentIndex !== -1) {
      this.tasks[currentIndex] = {
        ...this.tasks[currentIndex],
        status: status as TaskStatus
      };
    }

    // Sincroniza com backend (preserva todos os dados)
    this.taskService.updateTask(this.draggedTask.id, updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          // Backend confirmou a atualização - dados já atualizados localmente
          console.log('Task status updated successfully');
        },
        error: (error) => {
          console.error('Error updating task status:', error);
          // Em caso de erro, reverte a mudança local
          if (currentIndex !== -1) {
            this.tasks[currentIndex] = {
              ...this.tasks[currentIndex],
              status: this.draggedTask!.status // Reverte para status original
            };
          }
        }
      });

    this.draggedTask = null;
  }

  // MODAL: Funcionalidades do modal de edição de tarefas
  openTaskModal(task: Task): void {
    this.modalTask = { ...task };
    this.showModal = true;
    this.loadComments(task.id);
  }

  closeTaskModal(): void {
    // Se há mudanças não salvas, salva automaticamente antes de fechar
    if (this.hasUnsavedChanges && this.modalTask && !this.isSaving) {
      this.saveTaskFromModal();
      // Aguarda o salvamento completar antes de fechar
      return;
    }
    
    this.showModal = false;
    this.modalTask = null;
    this.editingTitle = false;
    this.editingDescription = false;
    this.hasUnsavedChanges = false;
    this.taskComments = [];
    this.showAddComment = false;
    this.newCommentContent = '';
    this.editingCommentId = null;
    this.editingCommentContent = '';
    this.editingTask = null;
    this.editForm = { title: '', description: '' };
  }

  saveTaskFromModal(): void {
    if (!this.modalTask || this.isSaving) return;
    
    this.isSaving = true;

    const updateRequest: UpdateTaskRequest = {
      title: this.editForm.title || this.modalTask.title,
      description: this.editForm.description || this.modalTask.description,
      priority: this.modalTask.priority,
      status: this.modalTask.status // Preserva o status atual
    };

    this.taskService.updateTask(this.modalTask.id, updateRequest).subscribe({
      next: (updatedTask) => {
        const index = this.tasks.findIndex(t => t.id === this.modalTask!.id);
        if (index !== -1) {
          // Preserva dados existentes, aplica apenas mudanças confirmadas pelo backend
          this.tasks[index] = {
            ...this.tasks[index], // Mantém dados originais
            ...updatedTask,       // Aplica mudanças do backend
            // Garante que os campos editados foram salvos (com fallbacks seguros)
            title: updateRequest.title || this.tasks[index].title,
            description: updateRequest.description || this.tasks[index].description,
            priority: updateRequest.priority ?? this.tasks[index].priority,
            status: updateRequest.status || this.tasks[index].status
          };
        }
        // Atualiza modal task com dados editados
        this.modalTask = {
          ...this.modalTask,
          ...updatedTask,
          title: updateRequest.title || this.modalTask!.title,
          description: updateRequest.description || this.modalTask!.description,
          priority: updateRequest.priority ?? this.modalTask!.priority,
          status: updateRequest.status || this.modalTask!.status
        };
        
        // Limpa editForm após salvar
        this.editForm = { title: '', description: '' };
        this.editingTask = null;
        this.hasUnsavedChanges = false;
        this.isSaving = false;
        
        // Fecha modal automaticamente após salvar (para salvamento automático)
        setTimeout(() => {
          if (!this.hasUnsavedChanges) {
            this.closeTaskModal();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error updating task:', error);
        this.editingTask = null;
        this.isSaving = false;
      }
    });
  }

  // QUICK ADD CARD: Funcionalidade de adição rápida de cartões
  startAddingCard(status: string): void {
    this.addingCard[status] = true;
    this.newCardTitle[status] = '';
  }

  confirmAddCard(status: string): void {
    const title = this.newCardTitle[status]?.trim();
    if (!title) return;

    const newTask: CreateTaskRequest = {
      title,
      description: '',
      priority: TaskPriority.NONE,
      projectId: this.DEFAULT_PROJECT_ID,
      status: status as TaskStatus // Define o status da coluna onde foi clicado
    };

    this.taskService.createTask(newTask).subscribe({
      next: (task) => {
        this.tasks.push(task);
        this.cancelAddCard(status);
      },
      error: (error) => {
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  cancelAddCard(status: string): void {
    this.addingCard[status] = false;
    this.newCardTitle[status] = '';
  }

  onCardTitleKeydown(event: KeyboardEvent, status: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmAddCard(status);
    } else if (event.key === 'Escape') {
      this.cancelAddCard(status);
    }
  }

  // COMMENTS: Sistema de comentários
  loadComments(taskId: string): void {
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

  addComment(): void {
    if (!this.modalTask || !this.newCommentContent.trim()) return;

    const createRequest: CreateCommentRequest = {
      content: this.newCommentContent.trim()
    };

    this.commentService.createComment(this.modalTask.id, createRequest).subscribe({
      next: (comment) => {
        this.taskComments.unshift(comment);
        this.newCommentContent = '';
        this.showAddComment = false;
      },
      error: (error) => {
        console.error('Erro ao salvar comentário:', error);
      }
    });
  }

  editComment(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
  }

  saveEditComment(comment?: Comment): void {
    if (!this.editingCommentId || !this.editingCommentContent.trim()) return;

    const updateRequest: UpdateCommentRequest = {
      content: this.editingCommentContent.trim()
    };

    this.commentService.updateComment(this.editingCommentId, updateRequest).subscribe({
      next: (updatedComment) => {
        const index = this.taskComments.findIndex(c => c.id === this.editingCommentId);
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
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

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

  // Column management methods moved to ColumnManagementComponent
  onColumnAdded(columnName: string): void {
    console.log('Column added:', columnName);
    this.loadTasks();
  }

  onColumnsUpdated(columns: ColumnData[]): void {
    this.columns = columns;
  }

  // deleteCustomColumn removido - agora usa deleteColumn para todas as colunas

  // Column deletion handled by ColumnManagementComponent
  handleColumnDeleted(columnId: string): void {
    const column = this.columns.find(c => c.id === columnId);
    if (!column) return;

    if (!confirm(`Tem certeza que deseja excluir a coluna "${column.label}"? Todos os cartões desta coluna serão perdidos.`)) return;

    // Remove from local array first for immediate UI feedback
    const updatedColumns = this.columns.filter(c => c.id !== columnId);
    this.columns = updatedColumns;

    // Call backend to delete using real UUID
    const realColumnId = column.realId || column.id;
    this.columnService.deleteColumn(realColumnId).subscribe({
      next: () => {
        // Remove tasks from deleted column
        this.tasks = this.tasks.filter(task => task.status !== columnId);
        // Reload tasks to sync with backend
        this.loadTasks();
      },
      error: (error: any) => {
        console.error('Erro ao deletar coluna:', error);
        // Rollback on error - restore the column
        this.columns = [...this.columns, column];
        alert('Erro ao excluir coluna. Tente novamente.');
      }
    });
  }

  // saveColumnsToStorage removido - persistência agora é feita via backend

  private loadSavedColumns(): ColumnData[] {
    const saved = localStorage.getItem('kanban_custom_columns');
    return saved ? JSON.parse(saved) : [];
  }

  private loadCustomTasks(): void {
    // Método placeholder para carregamento de tarefas customizadas se necessário
  }

  // TRACK BY FUNCTIONS: Performance optimization para ngFor
  trackByColumn(index: number, column: ColumnData): string {
    return column.id;
  }

  trackByTask(index: number, task: Task): string {
    return task.id;
  }

  // UTILITY METHODS: Helper methods for template bindings
  getTasksByStatusString(status: string): Task[] {
    return this.getTasksByStatus(status as TaskStatus);
  }

  // DRAG & DROP ADVANCED: Column drag functionality
  onColumnDragStart(event: DragEvent, columnId: string, index: number): void {
    this.draggedColumn = { ...this.columns.find(c => c.id === columnId)!, index };
  }

  onColumnDragEnd(): void {
    this.draggedColumn = null;
    this.dragOverColumnIndex = -1;
    this.dropPosition = null;
  }

  onColumnDragOver(event: DragEvent, columnId: string, index: number): void {
    event.preventDefault();
    this.dragOverColumnIndex = index;
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    this.dropPosition = x < rect.width / 2 ? 'left' : 'right';
  }

  onColumnDragLeave(): void {
    this.dragOverColumnIndex = -1;
    this.dropPosition = null;
  }

  onColumnDrop(event: DragEvent, columnId: string, targetIndex: number): void {
    event.preventDefault();
    if (!this.draggedColumn) return;

    const sourceIndex = this.draggedColumn.index;
    if (sourceIndex === targetIndex) return;

    // Reorder columns
    const column = this.columns.splice(sourceIndex, 1)[0];
    const insertIndex = this.dropPosition === 'left' ? targetIndex : targetIndex + 1;
    this.columns.splice(insertIndex, 0, column);

    // Update order values - Note: Backend sync for reordering not implemented yet
    this.columns.forEach((col, idx) => col.order = idx);

    this.onColumnDragEnd();
  }

  shouldShowGhost(index: number, position: 'left' | 'right'): boolean {
    return this.dragOverColumnIndex === index && this.dropPosition === position;
  }

  // Trash functionality moved to TrashDropZoneComponent
  handleTrashDrop(dragTarget: any): void {
    if (dragTarget.type === 'task') {
      this.deleteTask(dragTarget.id);
    } else if (dragTarget.type === 'column') {
      this.handleColumnDeleted(dragTarget.id);
    }
  }

  getCurrentDragTarget(): any {
    if (this.draggedTask) {
      return { type: 'task', id: this.draggedTask.id, data: this.draggedTask };
    } else if (this.draggedColumn) {
      return { type: 'column', id: this.draggedColumn.id, data: this.draggedColumn };
    }
    return null;
  }

  isDragActive(): boolean {
    return !!(this.draggedTask || this.draggedColumn);
  }

  // TOUCH SUPPORT: Mobile drag and drop
  onTouchStart(event: TouchEvent, task: Task): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.currentTouchTask = task;
    this.isDraggingTouch = false;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.currentTouchTask) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    
    if (deltaX > 10 || deltaY > 10) {
      this.isDraggingTouch = true;
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent, targetStatus: string): void {
    if (this.isDraggingTouch && this.currentTouchTask) {
      // Simulate drop
      this.onDrop(new DragEvent('drop'), targetStatus);
    }
    
    this.currentTouchTask = null;
    this.isDraggingTouch = false;
  }

  // MODAL FUNCTIONALITY: Extended modal features
  closeModal(): void {
    this.closeTaskModal();
  }

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTaskModal();
    }
  }

  onOverlayMouseUp(event: MouseEvent): void {
    // Placeholder for potential future functionality
  }

  // EDITING FUNCTIONALITY: Modal editing states
  editForm = { title: '', description: '' };
  descriptionTruncated = true;
  showPriorityDropdown = false;
  priorityOptions = [
    { value: TaskPriority.NONE, label: 'Sem Prioridade' },
    { value: TaskPriority.LOW, label: 'Baixa' },
    { value: TaskPriority.MEDIUM, label: 'Média' },
    { value: TaskPriority.HIGH, label: 'Alta' }
  ];

  startEdit(): void {
    if (this.modalTask) {
      this.editingTask = { ...this.modalTask };
      this.editForm = {
        title: this.modalTask.title,
        description: this.modalTask.description || ''
      };
    }
  }

  saveModalEdit(): void {
    this.saveTaskFromModal();
  }

  cancelModalEdit(): void {
    this.editingTask = null;
    this.editForm = { title: '', description: '' };
  }

  checkForChanges(): void {
    if (this.modalTask && this.editForm) {
      this.hasUnsavedChanges = 
        this.editForm.title !== this.modalTask.title ||
        this.editForm.description !== (this.modalTask.description || '');
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  toggleDescription(): void {
    this.descriptionTruncated = !this.descriptionTruncated;
  }

  shouldShowDescriptionToggle(): boolean {
    const description = this.modalTask?.description || '';
    return description.length > 150;
  }

  togglePriorityDropdown(): void {
    this.showPriorityDropdown = !this.showPriorityDropdown;
  }

  changePriority(priority: TaskPriority): void {
    if (this.modalTask) {
      this.modalTask = { ...this.modalTask, priority };
      this.checkForChanges();
    }
    this.showPriorityDropdown = false;
  }

  changeStatus(status: TaskStatus): void {
    if (this.modalTask) {
      this.modalTask = { ...this.modalTask, status };
      this.checkForChanges();
    }
  }

  showDeleteConfirm(taskId: string): void {
    this.deleteTask(taskId);
  }

  // Column title editing moved to ColumnManagementComponent

  // COMMENT FUNCTIONALITY: Extended comment features
  saveComment(): void {
    this.addComment();
  }

  toggleAddComment(): void {
    this.showAddComment = !this.showAddComment;
    if (this.showAddComment) {
      this.newCommentContent = '';
    }
  }

  onCommentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.addComment();
    }
  }

  onCommentBlur(): void {
    // Removed auto-save on blur to prevent race conditions
    // User must explicitly save comments
  }

  formatCommentDate(date: string): string {
    return this.getTimeAgo(new Date(date));
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'agora mesmo';
    } else if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    } else {
      // Para mais de 30 dias, mostra data completa
      return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // STATUS DROPDOWN: Status selection functionality
  showStatusDropdown = false;
  statusOptions = [
    { value: TaskStatus.PENDING, label: 'Pendente' },
    { value: TaskStatus.IN_PROGRESS, label: 'Em Progresso' },
    { value: TaskStatus.TESTING, label: 'Em Teste' },
    { value: TaskStatus.DONE, label: 'Concluído' }
  ];

  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  // EXPANDED COMMENT: Comment expansion functionality
  expandedComment: Comment | null = null;

  expandComment(comment: Comment): void {
    this.expandedComment = comment;
  }

  closeExpandedComment(): void {
    this.expandedComment = null;
  }

  editFromExpanded(): void {
    if (this.expandedComment) {
      this.editComment(this.expandedComment);
      this.closeExpandedComment();
    }
  }

  deleteFromExpanded(): void {
    if (this.expandedComment) {
      this.deleteComment(this.expandedComment.id);
      this.closeExpandedComment();
    }
  }

  // ADDITIONAL COMMENT FUNCTIONALITY: Missing methods
  cancelComment(): void {
    this.newCommentContent = '';
    this.showAddComment = false;
  }

  trackComment(index: number, comment: Comment): string {
    return comment.id;
  }

  startEditComment(comment: Comment): void {
    this.editComment(comment);
  }

  onEditCommentKeydown(event: KeyboardEvent, comment: Comment): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditComment();
    } else if (event.key === 'Escape') {
      this.cancelEditComment();
    }
  }

  onEditCommentBlur(comment: Comment): void {
    // Removed auto-save on blur to prevent race conditions
    // User must explicitly save comments
  }

  isCommentLong(content: string): boolean {
    return content.length > 100;
  }


  // DELETE CONFIRMATION: Modal delete confirmation functionality
  showDeleteConfirmModal = false;
  taskToDelete: string | null = null;

  confirmDelete(): void {
    if (this.taskToDelete) {
      this.deleteTask(this.taskToDelete);
      this.showDeleteConfirmModal = false;
      this.taskToDelete = null;
    }
  }

  cancelDeleteConfirm(): void {
    this.showDeleteConfirmModal = false;
    this.taskToDelete = null;
  }

  // TEMPLATE BINDING FIXES: Property name corrections
  get addingToColumn(): { [key: string]: boolean } {
    return this.addingCard;
  }
}