# 📋 Kanban Board - React + TypeScript + NestJS

Sistema completo de gerenciamento de tarefas estilo Kanban, desenvolvido com React + TypeScript no frontend e NestJS no backend.

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- PostgreSQL (ou usar Supabase)

### Instalação e Execução

```bash
# Clone o repositório
git clone <seu-repo>
cd kanban-react

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
kanban-react/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Autenticação JWT
│   │   ├── users/    # Gerenciamento de usuários
│   │   ├── projects/ # Boards/Projects
│   │   ├── tasks/    # Tarefas
│   │   ├── columns/  # Colunas customizáveis
│   │   └── database/ # Entities TypeORM
│   └── .env          # Configurações do banco
│
└── frontend/         # React + TypeScript
    ├── src/
    │   ├── api/      # Axios + API services
    │   ├── stores/   # Zustand state management
    │   ├── pages/    # Login, Dashboard, Kanban
    │   ├── components/ # Componentes reutilizáveis
    │   └── types/    # TypeScript interfaces
    └── .env          # Configuração da API URL
```

---

## ⚙️ Configuração

### Backend (.env)

```env
# Database (PostgreSQL/Supabase)
DB_HOST=your-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=postgres

# JWT Secret
JWT_SECRET=your-secret-key

# Application
NODE_ENV=development
PORT=3000
```

### Frontend (.env)

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
- [x] **Drag & Drop** - Mover tarefas entre colunas
- [x] **Interface Responsiva** - Mobile-first design
- [x] **Permissões RBAC** - 4 níveis (Admin, Manager, Developer, Viewer)
- [x] **TypeScript Full Stack** - Type-safety completo
- [x] **Testes Completos** - 45 testes backend + 48 testes frontend

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
npm run dev              # Vite dev server

# Testes
npm run test             # 48 testes
npm run test:watch       # Watch mode
npm run test:ui          # Interface visual

# Build
npm run build            # Produção
npm run preview          # Preview do build
```

---

## 🏗️ Tecnologias Utilizadas

### Backend
- **NestJS 11** - Framework Node.js
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Swagger** - Documentação automática
- **Class-validator** - Validação de DTOs

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router v6** - Rotas
- **Zustand** - State management
- **Axios** - HTTP client
- **@dnd-kit** - Drag & drop
- **Vitest** - Testing framework
- **Testing Library** - React component testing
- **CSS Modules** - Estilos

---

## 🔐 Sistema de Permissões

O sistema possui 4 níveis hierárquicos de permissão:

```
Admin > Manager > Developer > Viewer
```

- **Admin**: Acesso total ao sistema
- **Manager**: Gerencia projetos e usuários
- **Developer**: CRUD de próprias tarefas
- **Viewer**: Apenas visualização

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

### Backend (45 testes)
```bash
cd backend && npm run test

# Exemplos de suítes:
# ✅ Auth (login, register, JWT)
# ✅ Tasks (CRUD, validações)
# ✅ DTOs (class-validator real)
# ✅ Utilities (helpers, formatters)
```

### Frontend (48 testes)
```bash
cd frontend && npm run test

# Suítes implementadas:
# ✅ authStore (6 testes) - State management, localStorage, error handling
# ✅ kanbanStore (24 testes) - Projects, tasks, columns CRUD
# ✅ TaskCard (11 testes) - Component rendering, user interactions
# ✅ Auth Integration (7 testes) - Login, register, logout flows

# Testes com Vitest + Testing Library + jsdom
```

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

**Stack:** React + TypeScript + NestJS + PostgreSQL
