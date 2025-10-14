# 📋 Nawa Kanban - React + TypeScript + NestJS

Sistema completo de gerenciamento de tarefas estilo Kanban, desenvolvido com React 19 + TypeScript no frontend e NestJS 11 no backend.

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- PostgreSQL (ou usar Supabase)

### Instalação e Execução

```bash
# Clone o repositório
git clone <seu-repo>
cd nawa-kanban

# Terminal 1 - Backend
cd backend
npm install
# Configure o .env com suas credenciais do banco
cp .env.example .env
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

**✅ Pronto!** Acesse:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs (Swagger): http://localhost:3000/api/docs

---

## 📁 Estrutura do Projeto

```
nawa-kanban/
├── backend/          # NestJS 11 API
│   ├── src/
│   │   ├── auth/       # Autenticação JWT
│   │   ├── users/      # Gerenciamento de usuários
│   │   ├── projects/   # Boards/Projects
│   │   ├── tasks/      # Tarefas
│   │   ├── columns/    # Colunas customizáveis
│   │   ├── comments/   # Sistema de comentários
│   │   └── database/   # Entities TypeORM
│   ├── .env            # Configurações do banco
│   └── package.json
│
└── frontend/         # React 19 + TypeScript + Vite 7
    ├── src/
    │   ├── api/          # Axios + API services
    │   ├── stores/       # Zustand state management
    │   ├── pages/        # Login, Dashboard, Kanban
    │   ├── components/   # Componentes reutilizáveis
    │   ├── contexts/     # React contexts (Toast, etc)
    │   └── types/        # TypeScript interfaces
    ├── .env              # Configuração da API URL
    ├── vite.config.ts    # Configuração do Vite
    └── package.json
```

---

## ⚙️ Configuração

### 🗄️ Setup do Banco de Dados

**📖 [Guia Completo de Setup do Banco de Dados](./DATABASE-SETUP.md)**

**Para primeira vez:** Execute o arquivo `database-schema.sql` no Supabase SQL Editor.

Resumo rápido:
1. Acesse [Supabase](https://supabase.com)
2. Crie um novo projeto
3. **SQL Editor** → Execute `database-schema.sql` (cria todas as 6 tabelas)
4. Copie as credenciais (Settings → Database → Connection string)
5. Configure o `.env` no backend

### Backend (.env)

```bash
# 1. Copie o arquivo de exemplo
cd backend
cp .env.example .env

# 2. Edite o .env com suas credenciais do Supabase
```

```env
# Database (Session Pooler - recomendado)
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.your-project-id
DB_PASSWORD=sua-senha-do-supabase
DB_NAME=postgres

# JWT Secret
JWT_SECRET=kanban-jwt-secret-key-2025

# Application
NODE_ENV=development
PORT=3000
```

```bash
# 3. Inicie o servidor
npm run start:dev

# ✅ As tabelas serão criadas automaticamente!
# TypeORM usa auto-sync em desenvolvimento (synchronize: true)
```

**💡 Nota:** O banco é criado automaticamente. Não precisa rodar SQL manualmente!
Para produção ou times, veja [DATABASE-SETUP.md](./DATABASE-SETUP.md)

### Frontend (.env)

```bash
# 1. Copie o arquivo de exemplo
cd frontend
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

---

## ✨ Funcionalidades Implementadas

### ✅ Requisitos Obrigatórios
- [x] **Autenticação JWT** - Sistema completo de login/registro
- [x] **CRUD de Tarefas** - Criar, editar, visualizar e deletar tarefas
- [x] **Boards** - Múltiplos boards por usuário
- [x] **Status de Tarefas** - Colunas customizáveis
- [x] **Prioridades** - 4 níveis (none, low, medium, high)

### ✅ Funcionalidades Extras
- [x] **Busca de Tarefas** - Busca por nome/título
- [x] **Filtros por Status** - Filtrar tarefas por coluna
- [x] **Drag & Drop** - Mover tarefas entre colunas (@dnd-kit)
- [x] **Compartilhamento de Boards** 🆕 - Compartilhe com Editor ou Viewer
- [x] **Interface Responsiva** - Mobile-first design
- [x] **Permissões RBAC** - 4 níveis (Admin, Manager, Developer, Viewer)
- [x] **TypeScript Full Stack** - Type-safety completo
- [x] **Testes Completos** - Unitários (Vitest) + E2E (Playwright)
- [x] **Toast Notifications** - Feedback visual profissional
- [x] **Sistema de Comentários** - Comentários em tarefas

---

## 🎯 Comandos Úteis

### Backend

```bash
cd backend

# Desenvolvimento
npm run start:dev        # Hot-reload

# Testes
npm run test             # 45 testes
npm run test:cov         # Com cobertura
npm run test:watch       # Watch mode

# Build & Produção
npm run build
npm run start:prod

# Database
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev              # Vite dev server (porta 5173)

# Testes unitários
npm run test             # Vitest - run all tests
npm run test:watch       # Watch mode
npm run test:ui          # Interface visual do Vitest

# Testes E2E
npm run test:e2e         # Playwright - headless
npm run test:e2e:headed  # Com navegador visível
npm run test:e2e:ui      # Interface do Playwright
npm run test:e2e:debug   # Debug mode

# Build e produção
npm run build            # TypeScript + Vite build
npm run preview          # Preview do build local
npm run lint             # ESLint
```

---

## 🏗️ Tecnologias Utilizadas

### Backend
- **NestJS 11** - Framework Node.js com TypeScript
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional (Supabase)
- **JWT** - Autenticação stateless
- **Bcrypt** - Hash de senhas
- **Swagger** - Documentação automática da API
- **Class-validator** - Validação de DTOs

### Frontend
- **React 19.1** - UI Library
- **TypeScript 5.9** - Type safety
- **Vite 7.1** - Build tool ultrarrápido
- **React Router v7** - Rotas client-side
- **Zustand** - State management leve e performático
- **Axios 1.12** - HTTP client
- **@dnd-kit** - Drag & drop acessível
- **Vitest 3.2** - Testing framework (compatível com Vite)
- **Playwright 1.56** - Testes E2E
- **Testing Library** - React component testing
- **CSS3** - Estilos customizados

---

## 🔐 Sistema de Permissões

### Permissões Globais (Usuários do Sistema)

O sistema possui 4 níveis hierárquicos de permissão:

```
Admin > Manager > Developer > Viewer
```

- **Admin**: Acesso total ao sistema
- **Manager**: Gerencia projetos e usuários
- **Developer**: CRUD de próprias tarefas
- **Viewer**: Apenas visualização

### Compartilhamento de Boards 🆕

Ao compartilhar um board com outro usuário, você pode definir 2 roles:

- **Owner/Manager**: Dono do projeto (criador do board)
- **Editor**: Pode editar tasks, mover cards, modificar o board
- **Viewer**: Somente visualização, não pode editar

**Exemplo de uso:**
1. Crie um board no sistema
2. Clique em "Share" no header do board
3. Adicione membros por email com role Editor ou Viewer
4. Membros verão o board compartilhado na lista de projetos

---

## 📖 API Endpoints

### Auth
- `POST /auth/register` - Registrar usuário
- `POST /auth/login` - Login
- `GET /auth/profile` - Perfil do usuário

### Projects (Boards)
- `GET /projects` - Listar boards
- `POST /projects` - Criar board
- `PATCH /projects/:id` - Atualizar board
- `DELETE /projects/:id` - Deletar board

### Board Sharing 🆕
- `GET /projects/:id/members` - Listar membros compartilhados
- `POST /projects/:id/members` - Adicionar membro (Editor ou Viewer)
- `PATCH /projects/:id/members/:memberId` - Atualizar role do membro
- `DELETE /projects/:id/members/:memberId` - Remover membro

### Tasks
- `GET /tasks` - Listar tarefas (com filtros)
- `GET /tasks/search?query=...` - Buscar tarefas
- `POST /tasks` - Criar tarefa
- `PATCH /tasks/:id` - Atualizar tarefa
- `DELETE /tasks/:id` - Deletar tarefa

### Columns
- `GET /columns` - Listar colunas
- `POST /columns` - Criar coluna
- `PATCH /columns/:id` - Atualizar coluna
- `DELETE /columns/:id` - Deletar coluna

**Documentação completa:** http://localhost:3000/api/docs

---

## 🧪 Testes

### Backend
```bash
cd backend

npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:cov       # With coverage

# Suítes de testes:
# ✅ Auth - Login, register, JWT validation
# ✅ Tasks - CRUD operations, validations
# ✅ DTOs - class-validator real validations (no mocks)
# ✅ Utilities - Helpers, formatters
# ✅ Guards - JWT auth guard, RBAC roles guard
```

### Frontend (Testes Unitários + E2E)
```bash
cd frontend

# Testes unitários com Vitest
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:ui           # Visual UI

# Suítes implementadas:
# ✅ authStore - State management, localStorage, error handling
# ✅ kanbanStore - Projects, tasks, columns CRUD
# ✅ TaskCard - Component rendering, user interactions
# ✅ Auth Integration - Login, register, logout flows

# Stack: Vitest 3.2 + Testing Library + jsdom
```

### Testes E2E com Playwright
```bash
cd frontend && npm run test:e2e

# Testes E2E em modo visual (headed):
npm run test:e2e:headed     # Navegador visível com slowMo
npm run test:e2e:ui          # Interface interativa do Playwright
npm run test:e2e:debug       # Modo debug passo a passo

# Suítes E2E:
# ✅ auth.spec.ts (5 testes) - Registration, login, form validation
# ✅ boards.spec.ts (5 testes) - Board creation, navigation, modals
# ✅ tasks.spec.ts (8 testes) - Task CRUD, filters, priority badges
# ✅ dragdrop.spec.ts (7 testes) - Drag & drop, visual feedback

# Configuração visual: slowMo 500ms, headed mode
# Helpers: Authentication setup, board creation utilities
```

---

## 🆕 Melhorias Recentes (v2.0)

### UX & Feedback Visual
- ✅ **Toast Notifications** - Sistema profissional de notificações (success/error/warning/info)
- ✅ **Confirm Dialog** - Modal acessível em vez de `confirm()` nativo
- ✅ **Loading Spinner** - Componente animado com modo fullScreen
- ✅ **Password Strength Indicator** - Feedback visual em tempo real
- ✅ **Inline Validation** - Erros inline com aria-describedby

### Segurança & Validação
- ✅ **Input Sanitization** - Prevenção de XSS em todos os inputs
- ✅ **Strong Password** - Validação: 8+ chars, maiúscula, minúscula, número
- ✅ **Email Validation** - Regex robusto para validação de email
- ✅ **Request Timeout** - 30s timeout em todas as requisições
- ✅ **Safe Navigation** - Substituído `window.location.href` por React Router

### Performance
- ✅ **React.memo** - TaskCard memoizado para evitar re-renders
- ✅ **useMemo** - Filtros de tasks computados apenas quando necessário
- ✅ **useCallback** - Handlers memoizados em todos os componentes
- ✅ **useDebounce** - Search com 300ms de debounce

### Acessibilidade (WCAG 2.1)
- ✅ **aria-labels** - Todos os elementos interativos rotulados
- ✅ **aria-live** - Regiões dinâmicas anunciadas
- ✅ **role attributes** - Semântica correta (dialog, alert, status)
- ✅ **Focus Management** - Foco gerenciado em modais
- ✅ **Keyboard Navigation** - Navegação completa por teclado

### Arquitetura
- ✅ **ToastContext** - Gerenciamento global de notificações
- ✅ **Validation Utils** - Utilitários reutilizáveis de validação
- ✅ **Type Safety** - TypeScript configurado corretamente
- ✅ **Build Optimization** - Tests excluídos do build de produção

---

## 🎨 UI/UX

- **Design System** - Cores, espaçamentos e tipografia consistentes
- **Mobile-First** - Responsivo em todos os tamanhos de tela
- **Feedback Visual** - Loading states, erros e sucesso
- **Acessibilidade** - Labels, ARIA e navegação por teclado

---

## 📦 Deploy

### Backend (Render/Railway/Heroku)
```bash
npm run build:backend
# Configure as variáveis de ambiente no serviço
# Start command: npm run start:prod
```

### Frontend (Vercel/Netlify)
```bash
npm run build:frontend
# Output directory: frontend/dist
# Configure VITE_API_URL com a URL do backend em produção
```

---

## 🔧 Troubleshooting

### Backend não conecta ao banco
- Verifique as credenciais no `.env`
- Certifique-se que o PostgreSQL está rodando
- Para Supabase, use a connection string fornecida

### Frontend não conecta ao backend
- Verifique se o backend está rodando em `http://localhost:3000`
- Confirme que o `VITE_API_URL` no `.env` está correto
- Verifique CORS no backend (`src/main.ts`)

### Erros de autenticação
- Limpe o localStorage: `localStorage.clear()`
- Verifique se o JWT_SECRET está configurado no backend
- Confirme que o token não expirou

---

## 📝 Licença

MIT

---

## 👨‍💻 Autor

Desenvolvido como desafio técnico fullstack.

**Stack:** React 19 + TypeScript 5.9 + Vite 7 + NestJS 11 + PostgreSQL (Supabase)
