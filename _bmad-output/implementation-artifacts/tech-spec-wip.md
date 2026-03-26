---
title: 'IA-KANBA — Feature Roadmap: 6 Fases para Paridade com Trello/ClickUp'
slug: 'ia-kanba-feature-roadmap'
created: '2026-03-21'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19', 'NestJS 11', 'TypeScript 5.9', 'Vite 7', 'Zustand', '@dnd-kit', 'PostgreSQL 15', 'Redis', 'Docker', 'Gemini 2.0 Flash', 'LangChain', 'WebSocket (Socket.IO)', 'Web Speech API']
files_to_modify:
  - 'frontend/src/types/index.ts'
  - 'frontend/src/hooks/useTaskForm.ts'
  - 'frontend/src/components/TaskModal.tsx'
  - 'frontend/src/components/TaskModal.css'
  - 'frontend/src/components/TaskCard.tsx'
  - 'frontend/src/pages/KanbanPage.tsx'
  - 'frontend/src/api/services.ts'
  - 'frontend/src/App.tsx'
  - 'backend/src/app.module.ts'
  - 'backend/src/database/entities/column.entity.ts'
  - 'backend/src/database/entities/task.entity.ts'
files_to_create:
  - 'frontend/src/components/CommentSection.tsx'
  - 'frontend/src/components/CommentSection.css'
  - 'frontend/src/pages/ProfilePage.tsx'
  - 'frontend/src/pages/ProfilePage.css'
  - 'backend/src/labels/labels.module.ts'
  - 'backend/src/labels/labels.service.ts'
  - 'backend/src/labels/labels.controller.ts'
  - 'backend/src/database/entities/label.entity.ts'
  - 'backend/src/database/entities/notification.entity.ts'
  - 'backend/src/notifications/notifications.module.ts'
  - 'backend/src/notifications/notifications.service.ts'
  - 'backend/src/notifications/notifications.controller.ts'
  - 'backend/src/database/entities/activity-log.entity.ts'
  - 'backend/src/database/entities/checklist.entity.ts'
  - 'backend/src/database/entities/sprint.entity.ts'
  - 'backend/src/database/entities/automation-rule.entity.ts'
code_patterns:
  - 'TaskModal é dumb component (props-driven) — DEVE ser refatorado para smart component na Fase 1'
  - 'useTaskForm hook gerencia estado do formulário — precisa ser estendido com dueDate/assigneeId/startDate'
  - 'TaskCard usa memo() + useSortable — sempre manter memo ao modificar'
  - 'Toast: sempre usar useToastContext() para feedback ao usuário'
  - 'ConfirmDialog: sempre usar para operações destrutivas'
  - 'CSS por componente: cada .tsx tem seu .css ao lado, sem CSS global além do design-system.css'
  - 'Novos módulos NestJS: sempre registrar no app.module.ts'
  - 'Entidades TypeORM: sempre uuid, CreateDateColumn, UpdateDateColumn'
  - 'Guards JWT: JwtAuthGuard em todas as rotas protegidas'
  - 'commentsApi já definido em services.ts e funcionando'
test_patterns:
  - 'Sem testes automatizados ativos no projeto atualmente'
  - 'Testes manuais via Playwright MCP ou browser'
  - 'Backend: NestJS tem estrutura para Jest (jest.config.js existe)'
---

# Tech-Spec: IA-KANBA — Feature Roadmap (Fases 1–6)

**Created:** 2026-03-21

## Overview

### Problem Statement

O IA-KANBA é um sistema Kanban funcional com IA (LangChain + Gemini + WebSocket + voz), mas carece de 30 funcionalidades presentes em concorrentes como Trello, ClickUp, Linear e Asana. Uma análise detalhada (ver `_bmad-output/analysis/feature-gap-analysis.md`) identificou gaps críticos que impedem adoção como ferramenta principal de gestão de projetos: campos de tarefa incompletos na UI (due date, assignee, labels), ausência de comentários na interface, falta de visualizações alternativas (Calendar, Table, Dashboard), ausência de notificações in-app, sem sistema de automações, e sem sprints.

### Solution

Implementar as 30 funcionalidades identificadas em 6 fases incrementais, priorizadas por impacto vs esforço. A Fase 1 completa funcionalidades já 80% prontas no backend. As fases seguintes adicionam novas capacidades de forma incremental, sem quebrar o que já existe.

**Stack existente** (nada muda, apenas extensões):
- Frontend: React 19 + Vite 7 + Zustand + @dnd-kit + Axios + TypeScript
- Backend: NestJS 11 + TypeORM 0.3 + PostgreSQL 15 + Redis + JWT + Socket.IO
- IA: LangChain + Gemini 2.0 Flash + Redis Memory + WebSocket Gateway
- Deploy: Docker Compose (4 containers: postgres, redis, backend, frontend/nginx)

### Scope

**In Scope — Fase 1 (completar o que já existe):**
- Comentários no TaskModal (backend 100% pronto, só falta UI)
- Due date, start date e assignee no TaskModal e no TaskCard
- Página de perfil do usuário (backend pronto, falta UI)
- Filtros avançados no board (por assignee, due date)

**In Scope — Fase 2 (novas funcionalidades core):**
- Labels / Tags coloridas (entidade + CRUD + UI)
- Checklists dentro de tarefas
- Notificações in-app via WebSocket
- Calendar View
- Table / List View
- Histórico de atividade das tarefas
- Busca global cross-project

**In Scope — Fase 3 (produtividade):**
- Subtarefas (parentId na entidade Task)
- WIP Limits nas colunas
- Timeline navegável (atualmente fixa em 15 dias)
- Dashboard de métricas (recharts)
- Templates de tarefas e projetos

**In Scope — Fase 4 (automações):**
- Motor de automações: Trigger → Condition → Action
- Builder visual no frontend
- Execução assíncrona via BullMQ + Redis

**In Scope — Fase 5 (sprints / metodologia ágil):**
- Sistema de sprints (entidade Sprint, backlog separado)
- Burndown e velocity por sprint

**In Scope — Fase 6 (IA avançada):**
- Novas ferramentas para a IA existente (add_comment, create_checklist, set_due_date, assign_member, search_tasks, etc.)
- AI Agents proativos (cron job que analisa o board e gera alertas)
- AI Summary e Risk Reports
- AI Search semântica (pgvector)

**Out of Scope:**
- OAuth2 / SSO / SAML
- Mobile app nativo
- Integrações externas (Slack, GitHub, Zapier) — Fase futura não especificada
- White-label / multi-tenant
- Time tracking
- Anexos de arquivos (upload) — requer infraestrutura S3/Supabase Storage separada
- Two-factor authentication

## Context for Development

### Codebase Patterns

**Frontend (React 19 + TypeScript):**
- Páginas em `frontend/src/pages/` (DashboardPage, KanbanPage, LoginPage, OverviewPage, OrganizationDetailPage, TimelinePage)
- Componentes em `frontend/src/components/` (TaskModal, ConfirmDialog, Toast, LoadingSpinner, ColorPicker, ShareBoardModal, ErrorBoundary)
- IA em `frontend/src/components/ai-chat/` (AIChatPanel, ChatMessage, VoiceInput, useAIChat hook)
- API em `frontend/src/api/services.ts` — todos os endpoints Axios centralizados aqui
- Tipos em `frontend/src/types/index.ts` — fonte única de verdade dos tipos
- State: Zustand stores (`authStore`, `kanbanStore`) em `frontend/src/stores/`
- CSS por componente: cada `.tsx` tem seu `.css` ao lado
- Toast: contexto global `ToastContext`, usar `useToastContext()` para feedback
- ConfirmDialog: componente reutilizável para confirmações destrutivas

**Backend (NestJS 11):**
- Módulos em `backend/src/`: auth, users, projects, tasks, columns, comments, organizations, ai
- Entidades em `backend/src/database/entities/`
- Padrão: `*.module.ts` → `*.service.ts` → `*.controller.ts` → `dto/`
- Guards: `JwtAuthGuard` em todas as rotas protegidas
- CORS configurado no `main.ts` para múltiplas origens
- Swagger disponível em `/api`
- WebSocket: Socket.IO via `AiGateway` em `backend/src/ai/ai.gateway.ts`
- Redis: `ioredis` client já configurado e injetável

**Banco de dados:**
- TypeORM com PostgreSQL 15
- Migrations CLI configurado em `backend/src/database/data-source.ts`
- Entidades existentes: User, Project, Task, Column (KanbanColumn), Comment, Organization, OrganizationMember, ProjectMember

**Padrão de novo módulo NestJS:**
```
backend/src/{feature}/
  {feature}.module.ts
  {feature}.service.ts
  {feature}.controller.ts
  dto/
    create-{feature}.dto.ts
    update-{feature}.dto.ts
```

**Padrão de nova entidade TypeORM:**
- Sempre incluir: `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, `@UpdateDateColumn()`
- Relações com `@ManyToOne`, `@OneToMany`, `@ManyToMany` conforme necessário
- Após criar entidade: gerar migration com `typeorm migration:generate`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `frontend/src/types/index.ts` | Tipos TypeScript — `Task` já tem `dueDate?`, `assigneeId?`, `assignee?: User`. Falta `startDate?` |
| `frontend/src/api/services.ts` | `commentsApi` 100% funcional. `tasksApi.update` aceita qualquer `Partial<Task>` |
| `frontend/src/components/TaskModal.tsx` | Dumb component (props-driven, ~110 LOC). **DEVE ser refatorado para smart component** |
| `frontend/src/components/TaskCard.tsx` | Usa `memo()` + `useSortable`. Footer mostra apenas priority badge. Sem due date ou assignee |
| `frontend/src/hooks/useTaskForm.ts` | Gerencia title/description/priority/status. `getFormData()` não inclui dueDate/assigneeId |
| `frontend/src/pages/KanbanPage.tsx` | Passa estado do formulário via props ao TaskModal. Precisará ser adaptado |
| `frontend/src/pages/OverviewPage.tsx` | Padrão de uso de organizações, stats, drag-drop nativo |
| `frontend/src/components/ai-chat/useAIChat.ts` | Referência de hook WebSocket — padrão para notificações em tempo real |
| `backend/src/database/entities/task.entity.ts` | `dueDate`, `startDate`, `assigneeId` existem. Sem `parentId`, sem `sprintId` |
| `backend/src/database/entities/column.entity.ts` | Sem `wipLimit`. Tem `order`, `status`, `type`. **Precisa de migration para wipLimit** |
| `backend/src/database/entities/user.entity.ts` | Sem `username`, `avatar`. Tem `boardConfig` (JSON) não usado |
| `backend/src/app.module.ts` | Registrar todos os novos módulos aqui |
| `backend/src/comments/comments.service.ts` | 100% pronto: create, findByTask, update, remove com auth e UTC-3 |
| `backend/src/ai/ai-agent.service.ts` | Adicionar novas ferramentas aqui (Fase 6) — padrão `tool.schema` LangChain |
| `backend/src/ai/ai.gateway.ts` | Gateway WebSocket com salas por projeto — reusar para emitir notificações |
| `_bmad-output/analysis/feature-gap-analysis.md` | 30 gaps documentados em 12 categorias |
| `_bmad-output/implementation-artifacts/implementation-plan.md` | Plano detalhado por fase com critérios de aceite |

### Critical Technical Findings (da investigação)

#### ⚠️ DECISÃO ARQUITETURAL CRÍTICA — Fase 1: Refatorar TaskModal

**Situação atual:**
- `TaskModal` é um componente **dumb/presentacional** puro (~110 LOC)
- Recebe `title`, `description`, `priority`, `status` como props vindas do `KanbanPage`
- `useTaskForm` hook no `KanbanPage` gerencia o estado do formulário
- `KanbanPage.handleSaveTask()` é o que chama a API

**Problema:** Adicionar comentários, due date, assignee e futuramente labels/checklists requer:
- State local interno (lista de comentários, loading, novo comentário)
- Chamadas de API próprias (buscar membros, buscar comentários, postar comentário)
- Isso é **incompatível** com o padrão dumb component atual

**Decisão:** Refatorar `TaskModal` para **smart component** na Fase 1:
- Recebe apenas: `isOpen`, `editingTask: Task | null`, `columns`, `projectId`, `onClose`, `onTaskSaved`
- Gerencia internamente: form state (incluindo dueDate, assigneeId), comentários, loading
- Chama APIs diretamente (não precisa de `onSave` vindo de cima)
- `KanbanPage` para de gerenciar `taskForm` state — só escuta `onTaskSaved(task)` para atualizar o store

**Impacto:** `useTaskForm.ts` deixa de ser usado pelo KanbanPage. Pode ser movido para dentro do TaskModal ou deletado.

#### Campos — estado atual confirmado

| Campo | `types/index.ts` | Entidade Task | API aceita | UI atual |
|---|---|---|---|---|
| `dueDate` | ✅ `dueDate?: string` | ✅ `dueDate: Date` | ✅ via PATCH | ❌ não renderizado |
| `startDate` | ❌ **FALTA** | ✅ `startDate: Date` | ✅ via PATCH | ❌ não renderizado |
| `assigneeId` | ✅ `assigneeId?: string` | ✅ `assigneeId: string` | ✅ via PATCH | ❌ não renderizado |
| `assignee` | ✅ `assignee?: User` | ✅ via relation | ✅ retornado | ❌ não renderizado |
| `comments` | ✅ via `Comment` type | ✅ via `@OneToMany` | ✅ `/comments/task/:id` | ❌ sem UI |

**Ação Fase 1:** Adicionar `startDate?: string` ao tipo `Task` em `types/index.ts`.

#### KanbanColumn — campos confirmados

A entidade `KanbanColumn` (`column.entity.ts`) tem: `id`, `name`, `status`, `order`, `type`, `userId`.
- **Não tem** `wipLimit` — precisa de migration TypeORM para Fase 3
- **Não tem** `color` — o tipo `KanbanColumn` em `types/index.ts` tem `color?` mas a entidade não tem. Ignorar por ora.

#### commentsApi — confirmado 100% funcional

```typescript
commentsApi.getByTaskId(taskId)  // GET /comments/task/:taskId
commentsApi.create({ content, taskId })  // POST /comments
commentsApi.update(id, { content })  // PATCH /comments/:id
commentsApi.delete(id)  // DELETE /comments/:id
```
Retorna comentários com `user` populado (id, name, email, role). Ordena por `createdAt DESC`.

#### TaskCard — estrutura do footer

Atualmente o footer do `TaskCard` tem apenas o priority badge. Para adicionar due date e assignee:
- Footer: `[avatar assignee?] [due date badge?] [priority badge]`
- Due date: calcular se `dueDate < today` → "Atrasado" em vermelho
- Assignee avatar: inicial do nome em círculo — `name.charAt(0).toUpperCase()`
- Manter `memo()` no export

### Technical Decisions

1. **TaskModal smart component** — Refatorar de dumb para smart na Fase 1 para suportar comentários, due date e assignee sem prop drilling excessivo.
2. **Sem migração para Fase 1** — `dueDate`, `startDate`, `assigneeId` já existem. Só adicionar `startDate?` nos tipos TS.
3. **recharts para Dashboard (Fase 3)** — Leve, bem mantida, compatível com React 19.
4. **BullMQ para automações (Fase 4)** — Redis já existe no projeto. Alternativa descartada: cron job NestJS simples.
5. **pgvector para AI Search semântica (Fase 6)** — Supabase PostgreSQL já tem a extensão disponível.
6. **Notificações via `userId → Set<socketId>` map no AiGateway (Fase 2)** — O `AiGateway` já autentica por JWT e mantém `connectedUsers: Map<clientId, User>` (confirmado em `ai.gateway.ts:44`). Adicionar um **reverse map** `userSockets: Map<userId, Set<socketId>>` populado em `handleConnection` e limpo em `handleDisconnect`. Para emitir notificação para um usuário: `this.userSockets.get(userId)?.forEach(sid => this.server.to(sid).emit('notification', payload))`. **NÃO** criar um segundo gateway. [Fix F1]
7. **Labels como entidade separada (Fase 2)** — ManyToMany Task↔Label. Labels pertencem ao projeto. **Endpoints de associação task↔label ficam no `TasksModule`** (não no LabelsModule) para evitar circular dependency NestJS. LabelsModule cuida apenas do CRUD de labels. [Fix F6]
8. **Cross-cutting concerns via Event Emitter (Fase 2)** — Instalar `@nestjs/event-emitter`. Em vez de injetar `NotificationsService` e `ActivityLogService` diretamente em `CommentsService`/`TasksService`, os services existentes emitem eventos (`task.updated`, `comment.created`, `task.assigned`). `NotificationsService` e `ActivityLogService` escutam com `@OnEvent()`. Isso evita fan-in e circular deps. [Fix F7]
9. **Alinhar campo `order`↔`position` no KanbanColumn (Fase 1)** — A entidade backend usa `order` (`column.entity.ts:22`), o tipo frontend usa `position` (`types/index.ts:76`). Resolver no início da Fase 1 renomeando `position` → `order` em `types/index.ts`. [Fix F3]
10. **Migrations obrigatórias para** — `wipLimit` na coluna (Fase 3), `parentId` na task (Fase 3), `sprintId` na task (Fase 5).

## Implementation Plan

> **Convenção de prioridade:** 🔴 Fazer agora | 🟡 Próximo ciclo | 🟢 Backlog futuro

---

### FASE 1 — Completar o que já existe 🔴
> Zero migrations de banco de dados. Todo o backend já está pronto.

---

#### Task 1.0pre: Alinhar KanbanColumn `position` → `order`
- **Arquivo:** `frontend/src/types/index.ts`
- **Ação:** Renomear `position: number` → `order: number` na interface `KanbanColumn` para alinhar com a entidade backend (`column.entity.ts:22`). Buscar e atualizar qualquer uso de `column.position` no frontend (se houver). [Fix F3]

- [ ] AC 1.0pre: Dado que o campo foi renomeado no tipo, quando `tsc --noEmit` compila, então sem erros de tipo

---

#### Task 1.0: Refatorar TaskModal para Smart Component
- **Arquivo:** `frontend/src/components/TaskModal.tsx`
- **Ação:** Reescrever o componente. Interface nova:
  ```tsx
  interface TaskModalProps {
    isOpen: boolean;
    editingTask: Task | null;
    columns: KanbanColumn[];
    projectId: string;
    initialStatus?: string; // [Fix F2] — qual coluna foi clicada no "Add Task"
    onClose: () => void;
    onTaskSaved: (task: Task) => void;
    onTaskDeleted?: (taskId: string) => void;
  }
  ```
- **O que o componente passa a gerenciar internamente:**
  - `useState` para: title, description, priority, status, dueDate, startDate, assigneeId
  - `useState` para lista de comentários e loading de comentários
  - `useEffect` para carregar membros do projeto via `projectsApi.getMembers(projectId)`
  - `useEffect` para carregar comentários via `commentsApi.getByTaskId(taskId)` quando `editingTask` muda
  - **Inicializar `status` com `initialStatus` quando `editingTask === null`** (criando task nova) [Fix F2]
  - Chamada direta a `tasksApi.create` ou `tasksApi.update` no handler de salvar
- **Nota:** Remover dependência de `useTaskForm` do KanbanPage após este passo.

- [ ] AC 1.0a: Dado que `TaskModal` recebe `editingTask` com dados, quando é montado, então os campos de formulário são pré-preenchidos com os valores da task
- [ ] AC 1.0b: Dado que o modal está aberto com task existente, quando clico em salvar sem alterar nada, então o `PATCH /tasks/:id` é chamado e `onTaskSaved` é disparado

---

#### Task 1.1: Atualizar KanbanPage para nova API do TaskModal
- **Arquivo:** `frontend/src/pages/KanbanPage.tsx`
- **Ação:** Remover toda a lógica de `taskForm` (useTaskForm, handleSaveTask). Substituir por:
  ```tsx
  <TaskModal
    isOpen={showTaskModal}
    editingTask={editingTask}
    columns={displayColumns}
    projectId={projectId!}
    initialStatus={selectedColumnId} // [Fix F2] — passa a coluna clicada
    onClose={() => setShowTaskModal(false)}
    onTaskSaved={(task) => {
      if (editingTask) updateTask(task.id, task);
      else addTask(task);
      setShowTaskModal(false);
    }}
  />
  ```
- **Nota:** Remover imports de `useTaskForm`. Manter toda lógica de drag-drop, filtros e delete.

- [ ] AC 1.1a: Dado que clico em "Add Task" numa coluna, quando preencho o título e salvo, então a task aparece na coluna correta
- [ ] AC 1.1b: Dado que clico num card para editar, quando altero o título e salvo, então o card é atualizado no board sem reload

---

#### Task 1.2: Adicionar `startDate` ao tipo Task
- **Arquivo:** `frontend/src/types/index.ts`
- **Ação:** Adicionar campo `startDate?: string` na interface `Task` (após `dueDate?`).

- [ ] AC 1.2a: Dado que a API retorna uma task com `startDate`, quando TypeScript compila, então sem erro de tipo

---

#### Task 1.3: Due Date, Start Date e Assignee no TaskModal
- **Arquivo:** `frontend/src/components/TaskModal.tsx` (continuação da Task 1.0)
- **Ação:** Adicionar ao formulário do TaskModal:
  - Campo `dueDate`: `<input type="date" value={dueDate} onChange={...} />`
    - Converter: input usa `YYYY-MM-DD`, API recebe/retorna ISO string
    - Helper: `formatDateForInput(isoString) → 'YYYY-MM-DD'`
    - Helper: `formatInputForApi(dateString) → ISO string ou null`
  - Campo `startDate`: mesmo padrão do dueDate
  - Campo `assigneeId`: `<select>` populado com `projectMembers` (state interno)
    - Opção padrão: "Sem responsável"
    - Carregar via `projectsApi.getMembers(projectId)` no useEffect
    - Exibir: nome do membro como opção
  - Enviar `dueDate`, `startDate`, `assigneeId` no payload do `tasksApi.create/update`

- [ ] AC 1.3a: Dado que abro o TaskModal de uma task existente com `dueDate`, quando o modal abre, então o campo de data exibe a data corretamente no formato local
- [ ] AC 1.3b: Dado que defino uma due date e salvo, quando o card é renderizado no board, então a data aparece no TaskCard
- [ ] AC 1.3c: Dado que seleciono um assignee no dropdown e salvo, quando o board é re-renderizado, então o avatar do assignee aparece no card
- [ ] AC 1.3d: Dado que clico em "limpar data" no campo dueDate e salvo, quando o card é renderizado, então nenhuma data é exibida

---

#### Task 1.4: Due Date e Assignee visíveis no TaskCard
- **Arquivo:** `frontend/src/components/TaskCard.tsx`
- **Ação:** Adicionar ao footer do card (manter `memo()`):
  ```tsx
  <div className="task-footer">
    {task.assignee && (
      <span className="task-assignee-avatar" title={task.assignee.name}>
        {task.assignee.name.charAt(0).toUpperCase()}
      </span>
    )}
    {task.dueDate && (
      <span className={`task-due-date ${isDueDateOverdue(task.dueDate) ? 'overdue' : ''}`}>
        {formatDueDate(task.dueDate)}
      </span>
    )}
    <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
      {getPriorityLabel(task.priority)}
    </span>
  </div>
  ```
- **Helpers a criar** em `frontend/src/utils/dates.ts`:
  - `isDueDateOverdue(isoDate: string): boolean` → `new Date(isoDate) < startOfToday()`
  - `formatDueDate(isoDate: string): string` → "Hoje" / "Amanhã" / "Atrasado" / "15 Mar"
- **CSS:** `.task-assignee-avatar` (círculo 24px, fundo colorido, texto branco, font 10px), `.task-due-date.overdue` (texto vermelho)

- [ ] AC 1.4a: Dado que uma task tem `assignee`, quando visualizo o card no board, então vejo um círculo com a inicial do nome do responsável
- [ ] AC 1.4b: Dado que uma task tem `dueDate` de hoje, quando visualizo o card, então a due date exibe "Hoje" em cor normal
- [ ] AC 1.4c: Dado que uma task tem `dueDate` no passado, quando visualizo o card, então a due date exibe "Atrasado" em vermelho
- [ ] AC 1.4d: Dado que uma task não tem `dueDate` nem `assignee`, quando visualizo o card, então nenhum elemento extra aparece no footer

---

#### Task 1.5: Seção de Comentários no TaskModal
- **Arquivo novo:** `frontend/src/components/CommentSection.tsx` + `CommentSection.css`
- **Arquivo modificado:** `frontend/src/components/TaskModal.tsx`
- **Ação:** Criar componente `CommentSection` e integrar no TaskModal (apenas quando `editingTask !== null`):

  **`CommentSection` props:**
  ```tsx
  interface CommentSectionProps {
    taskId: string;
    currentUserId: string;
  }
  ```

  **Estado interno:**
  - `comments: Comment[]` — carregado via `commentsApi.getByTaskId(taskId)`, depois `.reverse()` para ordem ASC [Fix F4: backend retorna DESC, frontend inverte]
  - `newCommentText: string`
  - `editingCommentId: string | null`
  - `editingCommentText: string`
  - `loading: boolean`

  **Rendering:**
  - Lista de comentários (ordem ASC — mais antigo no topo, mais recente no final)
  - Cada comentário: avatar (inicial), nome, timestamp relativo ("há 2 horas"), texto
  - Botões editar/deletar visíveis apenas se `comment.userId === currentUserId`
  - Ao clicar editar: linha vira textarea inline com botões Salvar/Cancelar
  - Ao clicar deletar: usar `ConfirmDialog` antes de chamar API
  - Rodapé: textarea "Escreva um comentário..." + botão "Enviar"
  - Enviar desabilitado se textarea vazio

  **Integração no TaskModal:** renderizar `<CommentSection taskId={editingTask.id} currentUserId={currentUser.id} />` no final do modal, separado por `<hr>`.

  **Fonte do `currentUser`:** [Fix F11] Confirmado: `import { useAuthStore } from '../stores/authStore'` → `const { user } = useAuthStore()` → `user.id` (tipo `User | null`). Interface: `AuthState { user: User | null; token: string | null; isAuthenticated: boolean; ... }`. Sempre verificar `user !== null` antes de acessar `.id`. Alternativamente, `CommentSection` pode receber `currentUserId` como prop do `TaskModal` que já usa o store.

- [ ] AC 1.5a: Dado que uma task tem 3 comentários, quando abro o TaskModal, então vejo 3 comentários em ordem cronológica ascendente
- [ ] AC 1.5b: Dado que digito um texto e clico em Enviar, quando a chamada tem sucesso, então o textarea limpa e o comentário aparece no final da lista (mais recente por último) [Fix F4]
- [ ] AC 1.5c: Dado que sou autor de um comentário, quando clico em editar, então o texto vira textarea editável com botão Salvar
- [ ] AC 1.5d: Dado que clico em deletar meu comentário, quando confirmo no dialog, então o comentário desaparece da lista
- [ ] AC 1.5e: Dado que não sou autor de um comentário, quando visualizo a lista, então não vejo botões de editar/deletar naquele comentário
- [ ] AC 1.5f: Dado que a task é recém-criada, quando abro a aba de comentários, então vejo mensagem "Sem comentários ainda. Seja o primeiro!"

---

#### Task 1.6: Filtros Avançados no Board
- **Arquivo:** `frontend/src/pages/KanbanPage.tsx`
- **Ação:** Adicionar estados e lógica de filtro:
  - `filterAssigneeId: string | 'all'` → dropdown com membros do projeto (carregar junto com o projeto)
  - `filterDueDate: 'all' | 'overdue' | 'today' | 'this_week' | 'no_date'`
  - Atualizar `filteredTasks` `useMemo` para incluir os novos filtros
  - Adicionar `<select>` no header para cada filtro
  - Atualizar contagem de filtros ativos no botão "Limpar" (existente ou novo)

- [ ] AC 1.6a: Dado que seleciono "Atrasadas" no filtro de due date, quando o board renderiza, então apenas tasks com `dueDate` anterior a hoje são exibidas
- [ ] AC 1.6b: Dado que seleciono um membro no filtro de assignee, quando o board renderiza, então apenas tasks atribuídas a esse membro são exibidas
- [ ] AC 1.6c: Dado que dois filtros estão ativos (assignee + prioridade), quando clico em "Limpar filtros", então todos os filtros voltam a "all" e todas as tasks são exibidas

---

#### Task 1.7: Página de Perfil do Usuário
- **Arquivo novo:** `frontend/src/pages/ProfilePage.tsx` + `ProfilePage.css`
- **Arquivo modificado:** `frontend/src/App.tsx` (rota `/profile`), e qualquer header/nav que exiba o nome do usuário
- **Backend (novo):** [Fix F5] Criar endpoint `POST /auth/change-password` (ou `POST /users/change-password`) no `UsersService`:
  ```typescript
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) throw new ForbiddenException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);
  }
  ```
  - Adicionar `ChangePasswordDto`: `{ currentPassword: string, newPassword: string }` com validação `@MinLength(6)`
  - Adicionar rota no `UsersController`: `@Post('change-password') @UseGuards(JwtAuthGuard)`
- **Frontend:**
  - Adicionar `changePassword` ao `usersApi` em `services.ts`: `api.post('/users/change-password', { currentPassword, newPassword })`
  - Seção "Informações": campos para editar `name` (via `PATCH /users/:id`)
  - Seção "Senha": formulário com `currentPassword`, `newPassword`, `confirmPassword` — validar no frontend que `new === confirm`, depois chamar `POST /users/change-password`
  - Avatar: círculo grande com inicial do nome, cor de fundo determinística baseada no `userId`
  - Carregar dados atuais via `authApi.getProfile()` no mount
  - Atualizar `authStore.user` após salvar com sucesso

- [ ] AC 1.7a: Dado que acesso `/profile`, quando a página carrega, então vejo meu nome e email atuais preenchidos
- [ ] AC 1.7b: Dado que edito meu nome e clico em Salvar, quando a chamada tem sucesso, então o header do app reflete o novo nome sem reload
- [ ] AC 1.7c: Dado que preencho a nova senha mas `newPassword !== confirmPassword`, quando clico em Salvar Senha, então vejo mensagem de erro e a chamada à API não é feita
- [ ] AC 1.7d: Dado que preencho os três campos de senha corretamente e salvo, quando faço logout e login com a nova senha, então o login funciona

---

### FASE 2 — Novas Funcionalidades Core 🟡

---

#### Task 2.1: Labels / Tags Coloridas

**Backend:**
- [ ] Task 2.1a: Criar `backend/src/database/entities/label.entity.ts`
  - Campos: `id` (uuid), `name` (varchar 50), `color` (char 7, hex), `projectId`, `createdAt`
  - Relação `@ManyToOne(() => Project)` + `@ManyToMany(() => Task, task => task.labels)`
  - Gerar migration: `typeorm migration:generate src/database/migrations/AddLabels`

- [ ] Task 2.1b: Adicionar relação em `backend/src/database/entities/task.entity.ts`
  - `@ManyToMany(() => Label, label => label.tasks) @JoinTable({ name: 'task_labels' }) labels: Label[]`

- [ ] Task 2.1c: Criar `backend/src/labels/` (module, service, controller)
  - `GET /labels?projectId=` — listar labels do projeto (guard JWT, verificar acesso)
  - `POST /labels` — criar label `{ name, color, projectId }`
  - `PATCH /labels/:id` — editar nome/cor (apenas membro do projeto)
  - `DELETE /labels/:id` — deletar (remove da tabela de junção também)
  - **[Fix F6] Endpoints de associação task↔label ficam no `TasksController`** (não aqui):
    - `POST /tasks/:id/labels/:labelId` → `TasksService` injeta `LabelRepository`
    - `DELETE /tasks/:id/labels/:labelId` → idem
  - Registrar `LabelsModule` em `app.module.ts`
  - `LabelsModule` exporta `TypeOrmModule.forFeature([Label])` para que `TasksModule` importe e use

**Frontend:**
- [ ] Task 2.1d: Adicionar `labels?: Label[]` ao tipo `Task` em `types/index.ts` e criar interface `Label`
- [ ] Task 2.1e: Criar `labelsApi` em `services.ts` com todos os endpoints
- [ ] Task 2.1f: Criar `frontend/src/components/LabelBadge.tsx` — pill com cor de fundo e nome
- [ ] Task 2.1g: Criar `frontend/src/components/LabelSelector.tsx` — dropdown no TaskModal
  - Listar labels existentes do projeto (checkbox para selecionar)
  - Campo para criar nova label (nome + color picker de 12 cores)
  - Botão "Criar" inline
- [ ] Task 2.1h: Integrar LabelSelector no TaskModal e LabelBadge no TaskCard (máx 3 + "+N")
- [ ] Task 2.1i: Adicionar filtro por label no KanbanPage

**ACs:**
- [ ] AC 2.1a: Dado que sou membro de um projeto, quando abro o TaskModal, então vejo a seção de Labels com as labels do projeto
- [ ] AC 2.1b: Dado que crio uma label "Bug" com cor vermelha, quando salvo a task, então o badge "Bug" aparece no card no board
- [ ] AC 2.1c: Dado que seleciono uma label no filtro do board, quando filtro é aplicado, então apenas cards com essa label são exibidos

---

#### Task 2.2: Checklists dentro de Tarefas

**Backend:**
- [ ] Task 2.2a: Criar `backend/src/database/entities/checklist.entity.ts` e `checklist-item.entity.ts`
  - `Checklist`: `id`, `taskId`, `title`, `order`
  - `ChecklistItem`: `id`, `checklistId`, `text`, `completed` (bool), `order`, `completedAt`, `completedById`
  - Gerar migration: `AddChecklists`

- [ ] Task 2.2b: Criar `backend/src/checklists/` com CRUD e endpoint de toggle
  - `POST /tasks/:id/checklists` — criar checklist
  - `PATCH /checklists/:id` — renomear
  - `DELETE /checklists/:id` — deletar (cascade items)
  - `POST /checklists/:id/items` — adicionar item
  - `PATCH /checklist-items/:id` — editar texto
  - `PATCH /checklist-items/:id/toggle` — marcar/desmarcar como concluído
  - `DELETE /checklist-items/:id` — deletar item

**Frontend:**
- [ ] Task 2.2c: Criar `frontend/src/components/ChecklistSection.tsx`
  - Lista de checklists (cada uma com título + progress bar "X/Y")
  - Items: checkbox + texto (clicável para toggle) + botão deletar
  - Botão "Adicionar item" ao final de cada checklist
  - Botão "Adicionar checklist" no rodapé da seção
- [ ] Task 2.2d: Integrar `ChecklistSection` no TaskModal
- [ ] Task 2.2e: No TaskCard, exibir badge `"3/7 ✓"` se a task tiver checklists

**ACs:**
- [ ] AC 2.2a: Dado que clico em "Adicionar checklist" e digito um título, quando confirmo, então a checklist aparece no modal com progress bar "0/0"
- [ ] AC 2.2b: Dado que marco um item como concluído, quando o item é salvo, então o progress bar atualiza (ex: "1/3") e o item fica com linha tachada
- [ ] AC 2.2c: Dado que todos os itens de uma checklist estão concluídos, quando visualizo o TaskCard, então o badge mostra "3/3 ✓" e fica verde

---

#### Task 2.3: Notificações In-App

**Backend:**
- [ ] Task 2.3a: Criar `backend/src/database/entities/notification.entity.ts`
  - Campos: `id`, `userId`, `type` (enum), `title`, `body`, `read` (bool, default false), `entityId`, `entityType`, `createdAt`
  - Tipos: `'task_assigned' | 'task_commented' | 'due_date_warning' | 'member_added'`

- [ ] Task 2.3b: Criar `backend/src/notifications/` (module, service, controller)
  - `GET /notifications` — listar do usuário autenticado (max 50, ordem DESC)
  - `PATCH /notifications/:id/read` — marcar lida
  - `PATCH /notifications/read-all` — marcar todas como lidas
  - `NotificationsService.create(userId, type, title, body, entityId, entityType)` — usado internamente

- [ ] Task 2.3c: [Fix F7] Emitir eventos nos services existentes em vez de injeção direta:
  - Instalar `@nestjs/event-emitter` e registrar `EventEmitterModule.forRoot()` em `app.module.ts`
  - `TasksService`: ao atribuir task → `this.eventEmitter.emit('task.assigned', { taskId, assigneeId, assignedBy })`
  - `CommentsService`: ao criar comentário → `this.eventEmitter.emit('comment.created', { taskId, commentUserId, taskCreatedById })`
  - `ProjectsService`: ao adicionar membro → `this.eventEmitter.emit('member.added', { projectId, userId })`
  - `NotificationsService`: escuta com `@OnEvent('task.assigned')`, `@OnEvent('comment.created')`, etc.
  - `ActivityLogService` (Task 2.6): também escuta os mesmos eventos
  - **Vantagem:** zero injeções circulares, novos listeners podem ser adicionados sem modificar os services

- [ ] Task 2.3d: [Fix F1] Emitir via WebSocket usando o `userSockets` map no `AiGateway`:
  - Adicionar ao `AiGateway`:
    ```typescript
    private userSockets = new Map<string, Set<string>>(); // userId → Set<socketId>

    async handleConnection(client: Socket) {
      // ...após autenticar e obter user...
      this.connectedUsers.set(client.id, user);
      if (!this.userSockets.has(user.id)) this.userSockets.set(user.id, new Set());
      this.userSockets.get(user.id)!.add(client.id);
    }

    handleDisconnect(client: Socket) {
      const user = this.connectedUsers.get(client.id);
      if (user) this.userSockets.get(user.id)?.delete(client.id);
      this.connectedUsers.delete(client.id);
    }

    emitToUser(userId: string, event: string, payload: any) {
      this.userSockets.get(userId)?.forEach(sid => this.server.to(sid).emit(event, payload));
    }
    ```
  - `NotificationsService` injeta `AiGateway` e chama `this.aiGateway.emitToUser(userId, 'notification', payload)`
  - Payload: `{ id, type, title, body, entityId, entityType, createdAt }`

**Frontend:**
- [ ] Task 2.3e: Criar hook `useNotifications` — conecta ao WebSocket, mantém lista de notificações, expõe `unreadCount`, `markAsRead`, `markAllAsRead`
- [ ] Task 2.3f: Adicionar ícone de sininho no header com badge `unreadCount`
- [ ] Task 2.3g: Criar painel dropdown de notificações (lista com scroll, máx 50 itens)
  - Cada item: ícone por tipo, título em bold (se não lida), corpo, timestamp relativo
  - Clicar navega para a entidade relevante (`/board/:projectId` ou task no modal)
  - Botão "Marcar todas como lidas"

**ACs:**
- [ ] AC 2.3a: Dado que o usuário B atribui uma task ao usuário A, quando a ação é salva, então o usuário A recebe uma notificação in-app em tempo real sem reload
- [ ] AC 2.3b: Dado que tenho 3 notificações não lidas, quando clico no sininho, então vejo o painel com as 3 notificações e o badge mostra "3"
- [ ] AC 2.3c: Dado que clico em "Marcar todas como lidas", quando confirmo, então o badge desaparece e todos os itens ficam sem destaque

---

#### Task 2.4: Calendar View
- [ ] Task 2.4a: Criar `frontend/src/components/CalendarView.tsx` + `CalendarView.css`
  - **Interface [Fix F8]:**
    ```tsx
    interface CalendarViewProps {
      tasks: Task[];
      onTaskClick: (task: Task) => void; // Usa handleEditTask do KanbanPage
    }
    ```
  - Grid de 7 colunas × 5-6 linhas representando o mês
  - Cada célula: número do dia + lista de task cards (título truncado, cor de prioridade)
  - Navegação: botões "←" / "→" para mês anterior/seguinte + botão "Hoje"
  - Tasks sem `dueDate`: seção separada ao final "Sem data (N)"
  - Click num card: chama `onTaskClick(task)` → KanbanPage abre TaskModal

- [ ] Task 2.4b: Adicionar toggle de view no `KanbanPage` (Kanban / Calendário)
  - State: `viewMode: 'kanban' | 'calendar'`
  - Botões de toggle no header
  - Filtros existentes se aplicam ao Calendar também
  - Passar `tasks={filteredTasks}` e `onTaskClick={handleEditTask}` ao CalendarView

**ACs:**
- [ ] AC 2.4a: Dado que estou no Calendar View, quando navego para o mês seguinte, então o calendário exibe os dias e tasks do mês correto
- [ ] AC 2.4b: Dado que uma task tem `dueDate` no dia 15, quando estou no Calendar View do mês correspondente, então o card aparece na célula do dia 15
- [ ] AC 2.4c: Dado que clico num card no Calendar, quando o TaskModal abre, então posso editar a task normalmente

---

#### Task 2.5: Table / List View
- [ ] Task 2.5a: Criar `frontend/src/components/TableView.tsx` + `TableView.css`
  - **Interface [Fix F8]:**
    ```tsx
    interface TableViewProps {
      tasks: Task[];
      columns: KanbanColumn[];
      projectMembers: ProjectMember[];
      onTaskClick: (task: Task) => void; // Usa handleEditTask do KanbanPage
      onTaskUpdate: (taskId: string, data: Partial<Task>) => void; // Para edição inline
    }
    ```
  - Tabela HTML com colunas: Status (badge colorido), Título (clicável), Assignee (avatar + nome), Labels (pills), Due Date (formatada), Prioridade (badge)
  - Sort ao clicar no header da coluna (toggle ASC/DESC)
  - Edição inline: clicar em Status → dropdown, clicar em Assignee → dropdown
  - Salvar inline via `onTaskUpdate` com optimistic update
  - Agrupamento por projeto (se view cross-project) ou por status (dentro do projeto)

- [ ] Task 2.5b: Adicionar opção "Tabela" no toggle de view do `KanbanPage`
  - Passar `tasks={filteredTasks}`, `columns={displayColumns}`, `onTaskClick={handleEditTask}`, `onTaskUpdate={...}`

**ACs:**
- [ ] AC 2.5a: Dado que estou na Table View, quando clico no header "Due Date", então as tasks são ordenadas por data (mais próxima primeiro)
- [ ] AC 2.5b: Dado que clico no status de uma task na tabela, quando seleciono um novo status no dropdown, então a mudança é salva e a linha atualiza sem modal

---

#### Task 2.6: Histórico de Atividade

**Backend:**
- [ ] Task 2.6a: Criar `backend/src/database/entities/activity-log.entity.ts`
  - Campos: `id`, `entityId`, `entityType` ('task'|'project'|'column'), `action` (string), `userId`, `changes` (JSON), `createdAt`
  - Index em `entityId` + `entityType`

- [ ] Task 2.6b: Criar `ActivityLogService` com método `log(userId, action, entityId, entityType, changes?)`
- [ ] Task 2.6c: [Fix F7] Escutar eventos via `@OnEvent` em vez de injeção direta:
  - `ActivityLogService` escuta `@OnEvent('task.created')`, `@OnEvent('task.updated')`, `@OnEvent('comment.created')`
  - Os services já emitem esses eventos (definido em Task 2.3c)
- [ ] Task 2.6d: `GET /activity-log?taskId=&limit=20` — endpoint com guard JWT

**Frontend:**
- [ ] Task 2.6e: Adicionar aba "Atividade" no TaskModal (ao lado de "Comentários")
  - Timeline vertical: ícone por tipo + texto descritivo + timestamp
  - Texto: "João moveu para Em Progresso", "Maria alterou prioridade para Alta", "Você criou esta tarefa"

**ACs:**
- [ ] AC 2.6a: Dado que movo uma task de "Pendente" para "Em Progresso", quando abro a aba Atividade da task, então vejo um registro "X moveu para Em Progresso" com timestamp
- [ ] AC 2.6b: Dado que alguém comenta na task, quando abro a aba Atividade, então vejo "X adicionou um comentário"

---

#### Task 2.7: Busca Global Cross-Project

**Backend:**
- [ ] Task 2.7a: Criar endpoint `GET /search?q=&organizationId=` (opcional)
  - Buscar em `tasks` (title ILIKE, description ILIKE) do usuário
  - Buscar em `projects` (name ILIKE) do usuário
  - Retornar: `{ type: 'task'|'project', id, title, projectName, projectId, organizationName }`
  - Limitar: 10 tasks + 5 projects nos resultados
  - Guard JWT obrigatório

**Frontend:**
- [ ] Task 2.7b: Adicionar botão de busca global no header principal (ícone lupa ou `Ctrl+K`)
- [ ] Task 2.7c: Criar `frontend/src/components/GlobalSearch.tsx`
  - Input com debounce 300ms
  - Dropdown com resultados agrupados: "Tarefas (N)" e "Projetos (N)"
  - Cada resultado: ícone tipo, título, nome do projeto/org
  - Clicar em task: navega para `/board/:projectId` e abre o TaskModal da task
  - Clicar em projeto: navega para `/board/:projectId`
  - Estado "Sem resultados" e estado "Buscando..."
  - Fechar ao pressionar Escape

**ACs:**
- [ ] AC 2.7a: Dado que pressiono Ctrl+K, quando a caixa de busca abre, então o foco vai para o input
- [ ] AC 2.7b: Dado que digito "login" na busca, quando há tasks com "login" no título, então elas aparecem nos resultados com o nome do projeto
- [ ] AC 2.7c: Dado que clico num resultado de task, quando navego para o board, então o TaskModal dessa task abre automaticamente

---

### FASE 3 — Produtividade 🟡

---

#### Task 3.1: Subtarefas
- [ ] Task 3.1a: Adicionar `parentId` (nullable UUID, FK tasks.id) na entidade `Task` — gerar migration `AddTaskParentId`
- [ ] Task 3.1b: Atualizar `TasksService.findByProject` para incluir subtasks aninhadas (`relations: ['subtasks']`)
- [ ] Task 3.1c: Endpoint `GET /tasks/:id/subtasks` e adaptar `POST /tasks` para aceitar `parentId`
- [ ] Task 3.1d: Adicionar `parentId?: string`, `subtasks?: Task[]` ao tipo `Task` em `types/index.ts`
- [ ] Task 3.1e: Criar seção "Subtarefas" no TaskModal — lista inline com checkbox (toggle status) e botão "+ Adicionar subtarefa"
- [ ] Task 3.1f: Progress bar "X/Y subtarefas" no TaskModal e badge `"X/Y"` no TaskCard

**ACs:**
- [ ] AC 3.1a: Dado que abro uma task e clico "Adicionar subtarefa", quando digito título e confirmo, então a subtarefa aparece na lista aninhada
- [ ] AC 3.1b: Dado que marco todas as subtarefas como concluídas, quando o board é renderizado, então o badge mostra "3/3" em verde
- [ ] AC 3.1c: Dado que uma task tem `parentId`, quando ela é exibida no board, então ela aparece normalmente (subtarefas não são exibidas no board principal)

---

#### Task 3.2: WIP Limits nas Colunas
- [ ] Task 3.2a: Adicionar `wipLimit` (nullable int) na entidade `KanbanColumn` — gerar migration `AddColumnWipLimit`
- [ ] Task 3.2b: Expor `wipLimit` no `PATCH /columns/:id` (já existe o endpoint)
- [ ] Task 3.2c: No modal de edição de colunas do KanbanPage, adicionar campo numérico "Limite de tarefas (WIP)"
- [ ] Task 3.2d: No header da coluna, exibir `"N / wipLimit"` quando `wipLimit` definido. Cor vermelha se `N >= wipLimit`
- [ ] Task 3.2e: Ao tentar mover task para coluna com WIP excedido, exibir toast de aviso (não bloquear — apenas avisar)

**ACs:**
- [ ] AC 3.2a: Dado que configuro WIP limit de 3 numa coluna e ela tem 2 tasks, quando o board renderiza, então o header mostra "2/3" em cor normal
- [ ] AC 3.2b: Dado que a coluna tem 3/3 tasks (WIP atingido), quando movo mais uma task para ela, então um toast de aviso é exibido mas a ação é permitida
- [ ] AC 3.2c: Dado que configuro WIP limit, quando atualizo a página, então o limite persiste

---

#### Task 3.3: Timeline Navegável
- [ ] Task 3.3a: Adicionar state `windowStart: Date` e `zoomDays: 7|14|30|90` no `TimelinePage.tsx`
- [ ] Task 3.3b: Refatorar cálculo da janela para usar `windowStart + zoomDays` em vez de offsets fixos
- [ ] Task 3.3c: Adicionar controles: `← Anterior` / `→ Próximo` (avança/recua `zoomDays` dias) + botão `Hoje` + seletor de zoom
- [ ] Task 3.3d: (Opcional v1) Drag horizontal na barra da task para mover datas (mousedown + mousemove + mouseup → PATCH task)

**ACs:**
- [ ] AC 3.3a: Dado que clico "→ Próximo" na Timeline, quando a view renderiza, então a janela avança pelo número de dias do zoom selecionado
- [ ] AC 3.3b: Dado que seleciono zoom "30 dias", quando a Timeline renderiza, então 30 dias são visíveis no grid

---

#### Task 3.4: Dashboard de Métricas

**Backend:**
- [ ] Task 3.4a: Criar endpoint `GET /analytics/project/:id`
  - Query 1: `COUNT(*) GROUP BY status` (tasks por status)
  - Query 2: `COUNT(*) GROUP BY priority` (tasks por prioridade)
  - Query 3: `COUNT(*) GROUP BY assignee_id` com JOIN em users (tasks por membro)
  - Query 4: tasks concluídas por semana (últimas 8 semanas) — `GROUP BY DATE_TRUNC('week', completed_at)`
  - Retornar JSON estruturado com todos os arrays

**Frontend:**
- [ ] Task 3.4b: Instalar `recharts` via npm
- [ ] Task 3.4c: Criar `frontend/src/pages/DashboardPage.tsx` (rota `/board/:id/dashboard`)
- [ ] Task 3.4d: Implementar widgets:
  - `<PieChart>` com distribuição por status
  - `<BarChart>` com tasks por membro
  - `<LineChart>` com conclusões por semana (últimas 8)
  - Cards de números: Total aberto, Concluídas hoje, Atrasadas, Vencem esta semana

**ACs:**
- [ ] AC 3.4a: Dado que acesso `/board/:id/dashboard`, quando a página carrega, então vejo 4 widgets com dados do projeto
- [ ] AC 3.4b: Dado que o projeto tem 5 tasks em "Pendente" e 3 em "Concluído", quando vejo o PieChart, então as proporções estão corretas

---

#### Task 3.5: Templates de Tarefas
- [ ] Task 3.5a: Criar `backend/src/database/entities/task-template.entity.ts` — `id`, `userId`, `projectId`, `name`, `data` (JSON com campos da task)
- [ ] Task 3.5b: CRUD de templates: `GET/POST /task-templates?projectId=`, `DELETE /task-templates/:id`
- [ ] Task 3.5c: No TaskModal, botão "Salvar como template" (apenas em tasks existentes)
- [ ] Task 3.5d: No botão "Add Task" do KanbanPage, opção "Criar de template" que abre seletor de templates

**ACs:**
- [ ] AC 3.5a: Dado que salvo uma task como template, quando clico em "Criar de template", então vejo o template na lista e posso criar uma task pré-preenchida com os dados salvos

---

### FASE 4 — Automações 🟢

---

#### Task 4.1: Motor de Automações

**Backend:**
- [ ] Task 4.1a: Criar `backend/src/database/entities/automation-rule.entity.ts`
  - Campos: `id`, `projectId`, `name`, `enabled` (bool), `trigger` (JSON: `{type, conditions[]}`), `actions` (JSON[]: `{type, params}`), `lastRunAt`, `runCount`

- [ ] Task 4.1b: Criar `AutomationsModule` com:
  - `AutomationRulesService` — CRUD de regras
  - `AutomationEvaluatorService` — avalia triggers: `evaluate(event, context)`
  - `AutomationExecutorService` — executa actions via BullMQ queue

- [ ] Task 4.1c: Instalar `bullmq` no backend. Criar queue `automation-jobs` no Redis existente

- [ ] Task 4.1d: Injetar `AutomationEvaluatorService` nos services para disparar avaliação:
  - Em `TasksService.update`: disparar `task.status_changed`, `task.moved`, `task.assigned`
  - Em `TasksService.create`: disparar `task.created`
  - Via `@nestjs/schedule` (SchedulerModule): disparar `schedule.daily` e avaliar `task.due_date_passed`

- [ ] Task 4.1e: Endpoints: `GET/POST /automations?projectId=`, `PATCH /automations/:id`, `DELETE /automations/:id`

**Frontend:**
- [ ] Task 4.1f: Criar página de automações acessível via aba no KanbanPage (ou `/board/:id/automations`)
- [ ] Task 4.1g: Builder visual step-by-step: (1) Selecionar Trigger → (2) Adicionar Condições → (3) Adicionar Actions
- [ ] Task 4.1h: Lista de automações com toggle enable/disable e histórico de execuções (runCount + lastRunAt)

**ACs:**
- [ ] AC 4.1a: Dado que crio uma regra "quando task movida para Done → notificar o criador", quando movo uma task para Done, então o criador recebe notificação in-app
- [ ] AC 4.1b: Dado que tenho uma automação com `enabled: false`, quando a condição é atendida, então a action NÃO é executada
- [ ] AC 4.1c: Dado que a automação executa com sucesso, quando consulto a lista, então `lastRunAt` e `runCount` estão atualizados

---

### FASE 5 — Sprints 🟢

---

#### Task 5.1: Sistema de Sprints

**Backend:**
- [ ] Task 5.1a: Criar `backend/src/database/entities/sprint.entity.ts`
  - Campos: `id`, `projectId`, `name`, `startDate`, `endDate`, `goal`, `status` (enum: planning/active/completed), `storyPoints` (nullable int)

- [ ] Task 5.1b: Adicionar `sprintId` (nullable UUID, FK sprints.id) na entidade `Task` — gerar migration `AddTaskSprintId`

- [ ] Task 5.1c: Criar `SprintsModule`
  - `GET /sprints?projectId=` — listar sprints do projeto
  - `POST /sprints` — criar sprint
  - `PATCH /sprints/:id` — editar
  - `DELETE /sprints/:id` — deletar (apenas em status planning)
  - `POST /sprints/:id/start` — ativar sprint (muda status para active, só um ativo por vez)
  - `POST /sprints/:id/complete` — completar sprint (move tasks não concluídas para backlog ou próximo sprint)
  - Adaptar `GET /tasks?projectId=&sprintId=` para filtrar por sprint

**Frontend:**
- [ ] Task 5.1d: Adicionar seletor de sprint no header do KanbanPage
  - "Backlog" = tasks sem sprintId
  - Sprint ativo = tasks com `sprintId === activeSprintId`
- [ ] Task 5.1e: Criar tela de planejamento de sprint: arrastar tasks do backlog para o sprint selecionado

**ACs:**
- [ ] AC 5.1a: Dado que inicio um sprint, quando tasks são criadas, então posso associá-las ao sprint ativo
- [ ] AC 5.1b: Dado que completo um sprint com tasks pendentes, quando confirmo, então as tasks são movidas para o backlog automaticamente
- [ ] AC 5.1c: Dado que estou no sprint ativo, quando vejo o board, então apenas tasks do sprint são exibidas

---

#### Task 5.2: Relatórios de Sprint
- [ ] Task 5.2a: Endpoint `GET /analytics/sprint/:id/burndown` — retorna array `{date, tasksRemaining, storyPointsRemaining}` por dia do sprint
- [ ] Task 5.2b: Criar `frontend/src/pages/SprintReportPage.tsx` com `<LineChart>` de burndown e cards de velocity
- [ ] Task 5.2c: Adicionar link "Ver Relatório" ao finalizar sprint

**ACs:**
- [ ] AC 5.2a: Dado que um sprint foi completado, quando acesso o relatório, então vejo o burndown com os dados reais do sprint

---

### FASE 6 — IA Avançada 🟢

---

#### Task 6.1: Novas Ferramentas para a IA Existente
- **Arquivo:** `backend/src/ai/ai-agent.service.ts`
- **Ação:** Adicionar ao array `tools` do LangChain agent (manter padrão existente de `tool({ name, description, schema, func })`):

- [ ] Task 6.1a: `add_comment` — `CommentsService.create(taskId, content, user)`
- [ ] Task 6.1b: `add_label_to_task` — `LabelsService.assignToTask(taskId, labelName, projectId)` (resolve nome→id)
- [ ] Task 6.1c: `create_checklist` — `ChecklistsService.create(taskId, title, items[])`
- [ ] Task 6.1d: `set_due_date` — `TasksService.update(taskId, { dueDate })` (aceita texto como "amanhã", "próxima sexta")
- [ ] Task 6.1e: `assign_member` — `TasksService.update(taskId, { assigneeId })` (resolve nome→id via ProjectsService)
- [ ] Task 6.1f: `search_tasks` — `TasksService.search(query, userId)` retornando lista resumida
- [ ] Task 6.1g: `create_subtask` — `TasksService.create({ title, parentId, projectId, status })`

**ACs:**
- [ ] AC 6.1a: Dado que digo "Adiciona um comentário 'Em revisão' na task X", quando a IA processa, então o comentário aparece na task
- [ ] AC 6.1b: Dado que digo "Atribui a task X para João", quando a IA processa, então o assignee da task é atualizado para João (por nome, sem precisar de ID)
- [ ] AC 6.1c: Dado que digo "Cria uma subtarefa 'Escrever testes' na task X", quando a IA processa, então a subtarefa aparece aninhada na task X

---

#### Task 6.2: AI Agents Proativos
- [ ] Task 6.2a: Criar `backend/src/ai/ai-proactive.service.ts`
  - `@Cron('0 9 * * *')` — executa todo dia às 9h
  - Para cada projeto ativo (com atividade nos últimos 7 dias):
    - Buscar tasks atrasadas (dueDate < hoje, status != done)
    - Buscar tasks que vencem hoje
    - Verificar colunas com WIP excedido
  - Gerar notificações automáticas via `NotificationsService`
  - Se usuário está online (socket conectado), enviar também via WebSocket

**ACs:**
- [ ] AC 6.2a: Dado que existe uma task com dueDate de ontem, quando o cron das 9h executa, então o owner do projeto recebe notificação "Você tem 1 task atrasada: [nome da task]"

---

#### Task 6.3: AI Summary e Risk Reports
- [ ] Task 6.3a: Endpoint `GET /ai/project/:id/summary` — usa `AiAgentService.chat()` com prompt específico de resumo + contexto do board
- [ ] Task 6.3b: Botão "Resumo IA" na `OrganizationDetailPage` ao lado de cada projeto
- [ ] Task 6.3c: Modal de resumo com texto gerado pela IA e lista de riscos identificados

**ACs:**
- [ ] AC 6.3a: Dado que clico em "Resumo IA" num projeto com tasks, quando a resposta chega, então vejo um parágrafo descrevendo o estado atual e uma lista de alertas

---

#### Task 6.4: AI Search Semântica
- [ ] Task 6.4a: [Fix F10] Ativar extensão `pgvector` no PostgreSQL — **ANTES de gerar a migration**:
  - Atualizar `docker-compose.yml`: trocar `postgres:15` por `pgvector/pgvector:pg15`
  - Adicionar init script: `CREATE EXTENSION IF NOT EXISTS vector;`
  - Em produção (Supabase): executar o CREATE EXTENSION via SQL Editor
- [ ] Task 6.4b: Adicionar coluna `embedding vector(768)` na entidade Task
- [ ] Task 6.4c: Ao criar/atualizar task, gerar embedding de `title + description` via Gemini Embeddings API e salvar
- [ ] Task 6.4d: Endpoint `GET /search/semantic?q=` — gera embedding do query, busca por cosine similarity, retorna top 10
- [ ] Task 6.4e: Integrar na `GlobalSearch` como fallback quando busca textual retorna menos de 3 resultados

**ACs:**
- [ ] AC 6.4a: Dado que busco "problema de autenticação", quando há uma task com título "bug no sistema de login", então essa task aparece nos resultados semânticos mesmo sem correspondência textual exata

---

### Acceptance Criteria Globais

- [ ] AC-G1: Dado que qualquer nova feature é implementada, quando o `docker compose up` é executado do zero, então o sistema sobe completamente sem erros
- [ ] AC-G2: Dado que uma nova entidade é adicionada, quando o ambiente é iniciado, então a migration foi gerada e executada corretamente
- [ ] AC-G3: Dado que qualquer nova rota é criada no backend, quando chamada sem JWT, então retorna 401 Unauthorized
- [ ] AC-G4: Dado que as features de Fase 1 são implementadas, quando o board existente é testado, então drag-drop, filtros e IA continuam funcionando normalmente
- [ ] AC-G5: Dado que notificações são emitidas, quando o destinatário não está online, então as notificações persistem no banco e aparecem na próxima sessão

## Additional Context

### Dependencies a Adicionar

| Fase | Pacote | Onde | Comando | Motivo |
|------|--------|------|---------|--------|
| Fase 1 | nenhum | - | - | Zero dependências novas |
| Fase 2 | `@nestjs/event-emitter` | backend | `npm install @nestjs/event-emitter` | Eventos para cross-cutting concerns (notificações, activity log) [Fix F7] |
| Fase 3 | `recharts` | frontend | `npm install recharts` | Gráficos do Dashboard (já inclui tipos TS desde v2+, **NÃO instalar `@types/recharts`**) [Fix F9] |
| Fase 4 | `bullmq` | backend | `npm install bullmq` | Fila de jobs assíncronos para automações |
| Fase 4 | `@nestjs/schedule` | backend | `npm install @nestjs/schedule` | Cron jobs para `schedule.daily` |
| Fase 6 | `pgvector` | postgres (extensão) | Ver abaixo | Busca semântica com embeddings |

**[Fix F10] pgvector — setup obrigatório ANTES da migration (Task 6.4a):**
1. **docker-compose.yml:** Trocar imagem `postgres:15` por `pgvector/pgvector:pg15`
2. **init.sql** (ou no docker-compose command): `CREATE EXTENSION IF NOT EXISTS vector;`
3. **Supabase (produção):** Executar `CREATE EXTENSION IF NOT EXISTS vector;` via SQL Editor (Supabase free tier já suporta)
4. **Verificar localmente:** `docker compose up -d postgres && docker exec -it kanba-postgres psql -U postgres -c "SELECT * FROM pg_extension WHERE extname='vector';"` — deve retornar 1 linha
5. Só depois gerar a migration com `typeorm migration:generate` que adiciona `embedding vector(768)` na tabela tasks

**Não é necessário:** nenhum novo cliente HTTP, nenhum novo estado global (Zustand), nenhuma mudança no Docker Compose.

### Testing Strategy

**Fase 1 (manual):**
- Testar TaskModal refatorado: criar task, editar task, salvar comentário, ver due date no card
- Usar Playwright MCP para automação dos fluxos principais
- Verificar que drag-drop do board continua funcionando após refatoração

**Fase 2 (unit + manual):**
- `LabelsService`: unit tests para CRUD e associação task↔label
- `NotificationsService`: unit test para criação de notificação e verificar que trigger funciona
- `CommentsService`: já tem lógica; testar integração com NotificationsService
- Manual: abrir dois browsers, verificar notificação em tempo real

**Fase 3 (integration):**
- `SubtasksService`: testar criação, progresso calculado, que subtasks não aparecem no board principal
- `WIPLimit`: testar que o cálculo de count é correto, que o aviso é exibido

**Fase 4 (integration + E2E):**
- `AutomationEvaluatorService`: unit test por trigger type
- `AutomationExecutorService`: integration test com Redis real (BullMQ)
- E2E: criar regra via UI → disparar condição → verificar action executada

**Fase 6 (unit):**
- Cada nova ferramenta da IA: unit test mockando o service que ela chama
- Verificar que o agent usa a ferramenta corretamente dado o input do usuário

### Pre-Mortem: Riscos Identificados

1. **Risco alto — Refatoração TaskModal (Task 1.0):** Mudar o componente de dumb para smart pode quebrar fluxos existentes (criar task, editar task, drag-drop). Mitigar: implementar e testar completamente antes de avançar para Task 1.3.

2. **~~Risco médio — Notificações WebSocket (Task 2.3d):~~** RESOLVIDO [Fix F1] — usar `userSockets: Map<userId, Set<socketId>>` no `AiGateway` existente.

3. **Risco médio — Migração de banco para subtarefas (Task 3.1a):** A coluna `parent_id` é uma auto-referência na tabela `tasks`. TypeORM auto-referência pode gerar problemas de cascade. Testar em ambiente local antes de aplicar em produção (Supabase).

4. **Risco baixo — recharts com React 19 (Task 3.4b):** recharts deve ser compatível com React 19. Verificar peerDependencies antes de instalar. Alternativa: `@nivo/core` (já familiar do projeto RecorraJá).

5. **Risco baixo — pgvector no Supabase (Task 6.4a):** Supabase free tier suporta pgvector. Verificar se o PostgreSQL no docker-compose local também tem a extensão disponível (imagem padrão `postgres:15` não inclui por padrão — usar `pgvector/pgvector:pg15` no compose).

### Notes

- **⚠️ WORKTREE OBRIGATÓRIO:** Cada fase DEVE ser implementada em um worktree isolado com branch separada. Criar com: `git worktree add ../ia-kanba-fase-N feature/fase-N-nome`. Isso garante que a branch `main` permanece estável enquanto a fase está em desenvolvimento. Só fazer merge na main após code review e todos os ACs passando. Branches sugeridas:
  - Fase 1: `feature/fase-1-complete-existing`
  - Fase 2: `feature/fase-2-core-features`
  - Fase 3: `feature/fase-3-productivity`
  - Fase 4: `feature/fase-4-automations`
  - Fase 5: `feature/fase-5-sprints`
  - Fase 6: `feature/fase-6-advanced-ai`
- **Começar sempre pela Task 1.0pre** → depois 1.0 — o refactor do TaskModal é pré-requisito para 1.1, 1.2, 1.3, 1.4, 1.5
- Referência de gaps: `_bmad-output/analysis/feature-gap-analysis.md`
- Plano de fases anterior: `_bmad-output/implementation-artifacts/implementation-plan.md`
- O `commentsApi` em `services.ts` usa `getByTaskId` (não `getByTask`) — atenção ao chamar
- Para o avatar de assignee: usar cor determinística baseada no índice da letra `name.charCodeAt(0) % 8` aplicada a um array de 8 cores predefinidas
- Cada nova feature de Fase 2+ que adiciona campos a `Task` deve também: (1) atualizar `types/index.ts`, (2) atualizar o serializer da IA em `ai-context.service.ts` para incluir os novos dados no contexto enviado ao Gemini

## Review Notes

- **Adversarial review completada:** 11 findings (3 Critical, 4 High, 4 Medium)
- **Todos resolvidos (auto-fix):**
  - F1 [Critical]: WebSocket routing → `userSockets` Map no AiGateway (Tech Decision #6)
  - F2 [Critical]: `selectedColumnId` → prop `initialStatus` no TaskModal (Task 1.0)
  - F3 [Critical]: `order`↔`position` → renomear em types/index.ts (Task 1.0pre, Tech Decision #9)
  - F4 [High]: Comentários DESC→ASC → `.reverse()` no frontend (Task 1.5)
  - F5 [High]: Troca de senha → endpoint `POST /users/change-password` (Task 1.7)
  - F6 [High]: Labels circular dep → associação task↔label fica no TasksModule (Task 2.1c, Tech Decision #7)
  - F7 [High]: Fan-in services → `@nestjs/event-emitter` com `@OnEvent()` (Task 2.3c, 2.6c, Tech Decision #8)
  - F8 [Medium]: Views sem props → interfaces definidas com `onTaskClick` e `tasks` (Tasks 2.4a, 2.5a)
  - F9 [Medium]: `@types/recharts` removido — recharts v2+ é self-typed (Dependencies table)
  - F10 [Medium]: pgvector docker → imagem `pgvector/pgvector:pg15` + init script (Task 6.4a, Dependencies)
  - F11 [Medium]: `useAuthStore` → confirmado: `import { useAuthStore } from '../stores/authStore'` → `{ user } = useAuthStore()` → `user.id` (Task 1.5)
