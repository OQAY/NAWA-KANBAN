# MAPA FUNCIONAL: kanban.component.ts (3322 linhas)

## 📊 ANÁLISE DE RESPONSABILIDADES

### 1. **DRAG & DROP - Tarefas** (~400 linhas)
- `onDragStart(task)` - Iniciar arrastar tarefa
- `onDragEnd()` - Finalizar arrasto  
- `onDragOver(event)` - Sobre zona de drop
- `onDrop(event, status)` - Soltar tarefa em coluna
- `draggedTask` - Estado do item sendo arrastado
- Lógica de auto-scroll durante drag

### 2. **DRAG & DROP - Colunas** (~300 linhas)  
- `onColumnDragStart()` - Iniciar arrastar coluna
- `onColumnDragOver()` - Sobre outra coluna
- `onColumnDrop()` - Soltar coluna em nova posição
- `reorderColumns()` - Reordenar array de colunas
- `draggedColumn` - Estado da coluna sendo arrastada
- Ghost animations para preview

### 3. **TOUCH SUPPORT** (~200 linhas)
- `onTouchStart()` - Início do toque
- `onTouchMove()` - Movimento do dedo
- `onTouchEnd()` - Fim do toque
- Touch coordinates tracking
- Mobile drag simulation

### 4. **TASK MODAL** (~500 linhas)
- `openTaskModal(task)` - Abrir modal
- `closeTaskModal()` - Fechar modal  
- `saveTaskFromModal()` - Salvar alterações
- Form validation
- Modal state management
- Task creation/edit forms

### 5. **COMMENTS SYSTEM** (~400 linhas)
- `loadComments(taskId)` - Carregar comentários
- `addComment()` - Adicionar comentário
- `editComment()` - Editar comentário
- `deleteComment()` - Deletar comentário
- Comments state management
- Comment form handling

### 6. **COLUMN MANAGEMENT** (~300 linhas)
- `addCustomColumn()` - Criar coluna customizada
- `deleteCustomColumn()` - Remover coluna
- `saveColumns()` - Persistir no localStorage
- `loadSavedColumns()` - Carregar do localStorage
- Column reordering logic

### 7. **TASK CRUD OPERATIONS** (~300 linhas)
- `createTask()` - Criar nova tarefa
- `editTask()` - Editar tarefa existente
- `deleteTask()` - Remover tarefa
- `updateTaskStatus()` - Mover entre colunas
- Task validation
- Priority handling

### 8. **ADD CARD FEATURE** (~200 linhas)
- `startAddingCard(status)` - Iniciar adição
- `confirmAddCard(status)` - Confirmar nova tarefa
- `cancelAddCard(status)` - Cancelar adição
- `onCardTitleKeydown()` - Keyboard handling
- Quick task creation

### 9. **UI STATE MANAGEMENT** (~300 linhas)
- Loading states
- Error handling
- Form states
- Modal visibility
- Drag visual feedback
- Column highlighting

### 10. **UTILITY METHODS** (~200 linhas)
- `getTasksByStatus()` - Filtrar tarefas
- `getStatusLabel()` - Labels de status
- `getPriorityLabel()` - Labels de prioridade
- `trackByColumn()` - Angular trackBy
- `trackByTask()` - Angular trackBy

### 11. **LIFECYCLE & INITIALIZATION** (~100 linhas)
- `ngOnInit()` - Inicialização
- `initializeColumns()` - Setup de colunas
- `loadTasks()` - Carregar dados
- Component setup

### 12. **TEMPLATE HTML INLINE** (~500 linhas)
- Kanban board structure
- Task cards template
- Modal template
- Drag & drop zones
- Form templates

### 13. **CSS STYLES INLINE** (~800 linhas)
- Kanban board styling
- Card styling
- Modal styling
- Drag animations
- Responsive design

---

## 🎯 PLANO DE COMPONENTIZAÇÃO

### **PRIORIDADE 1: Extrair Templates**
1. **kanban.component.html** - Template principal
2. **kanban.component.scss** - Estilos principais

### **PRIORIDADE 2: Componentes Visuais** 
1. **TaskCardComponent** - Card individual (~100 linhas)
2. **TaskModalComponent** - Modal de edição (~200 linhas)  
3. **KanbanColumnComponent** - Coluna individual (~150 linhas)
4. **AddCardComponent** - Botão adicionar (~80 linhas)

### **PRIORIDADE 3: Services de Lógica**
1. **DragDropService** - Toda lógica de drag (~200 linhas)
2. **ColumnService** - Gerenciamento colunas (~150 linhas)
3. **KanbanStateService** - Estado global (~100 linhas)

### **PRIORIDADE 4: Componente Principal**
1. **KanbanComponent** - Apenas orquestração (~200 linhas)

---

## 🔥 CÓDIGO DUPLICADO IDENTIFICADO

### **Drag Event Handlers**
- Lógica similar entre task drag e column drag
- Event prevention repetido 5+ vezes
- DOM manipulation duplicada

### **Form Validation**
- Validação de título repetida 3x  
- Error handling similar em múltiplos forms
- Reset form logic duplicada

### **LocalStorage Operations**
- Save/load pattern repetido
- JSON parse/stringify repetido
- Error handling similar

### **Status/Priority Mapping**
- Label mapping repetido
- Enum conversion duplicada

---

## ⚡ ORDEM DE EXTRAÇÃO (Menor risco)

1. **Utilitários** → Services simples (sem estado)
2. **Templates** → Arquivos separados  
3. **Task Card** → Componente puro (só display)
4. **Modal** → Componente com estado isolado
5. **Column** → Componente com interações
6. **Drag Services** → Lógica complexa centralizada
7. **Main Component** → Orquestração final