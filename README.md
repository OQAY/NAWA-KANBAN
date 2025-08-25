# 📋 Nawa-Kanban

Sistema Kanban fullstack com Angular 18 + NestJS

![Angular](https://img.shields.io/badge/Angular-18-red.svg)
![NestJS](https://img.shields.io/badge/NestJS-11-ea2845.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## ✅ Funcionalidades

- **Autenticação**: Login/registro com JWT
- **4 Colunas**: Pendente, Em Progresso, Teste, Concluído
- **Cards**: Criação rápida (só título obrigatório)
- **Prioridades**: 4 níveis com ordenação automática
- **Drag & Drop**: Entre todas colunas + touch mobile
- **Comentários**: Sistema CRUD completo
- **Timestamps**: Relativos em português ("há 5 minutos")
- **Responsivo**: Layout adaptativo completo
- **Isolamento**: Dados separados por usuário

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL (local ou Supabase)
- Git

### 1. Backend (API)

```bash
# 1. Clone e instale dependências
git clone <repo-url>
cd backend
npm install

# 2. Configure banco de dados (.env)
cp .env.example .env
# Edite .env com suas credenciais PostgreSQL

# 3. Execute o servidor
npm run start:dev

# ✅ Backend rodando em: http://localhost:3000
# ✅ Documentação API: http://localhost:3000/api/docs
```

### 2. Frontend (Interface)

```bash
# Em novo terminal
cd frontend
npm install

# Execute o Angular
ng serve

# ✅ App rodando em: http://localhost:4200
```

### 3. Acesso Completo

**Frontend**: http://localhost:4200 (Interface do usuário)  
**Backend**: http://localhost:3000 (API REST)  
**Docs**: http://localhost:3000/api/docs (Swagger)  

### Execução Rápida (ambos)

```bash
# Terminal 1 - Backend
cd backend && npm install && npm run start:dev

# Terminal 2 - Frontend  
cd frontend && npm install && ng serve
```

**Sistema completo funcionando em ~30 segundos!**

## 🏗️ Arquitetura

### Backend (NestJS)

- **Clean Architecture** com TypeORM
- **JWT + RBAC** (4 níveis de acesso)
- **PostgreSQL** com migrations automáticas
- **Swagger** documentação automática

### Frontend (Angular 18)

- **Standalone components** sem NgModule
- **RxJS** com padrão takeUntil
- **SCSS modular** com design tokens
- **Memory leak prevention**

## 🔧 Tecnologias

**Backend**

- NestJS 11 + TypeORM + PostgreSQL
- JWT + Bcrypt + Class-validator
- Swagger + CORS + Guards

**Frontend**

- Angular 18 + RxJS + TypeScript
- SCSS + Responsive Design
- Drag & Drop nativo

## 📝 Banco de Dados

Sistema usa PostgreSQL configurado automaticamente:

- **Entities**: Task, User, Project, Comment
- **Migrations**: Aplicadas automaticamente
- **Seeds**: Dados iniciais no primeiro registro

## 🧪 Testes

### Backend (45 testes reais - zero mocks)
```bash
cd backend && npm run test
# ✅ Todos os 45 testes passam em ~5 segundos
# ✅ Validam comportamento real sem mocks problemáticos
```

**Suítes por área:**
```bash
cd backend && npm run test -- app.service.spec.ts          # 3 tests  
cd backend && npm run test -- create-task.dto.spec.ts      # 7 tests
cd backend && npm run test -- task-validation.spec.ts      # 5 tests  
cd backend && npm run test -- time-utils.spec.ts           # 7 tests
cd backend && npm run test -- tasks.controller.spec.ts     # 7 tests
cd backend && npm run test -- test-suite.spec.ts           # 16 tests
```

### Frontend (4 testes reais)
```bash
cd frontend && ng test --browsers=ChromeHeadless --watch=false
# ✅ Todos os 4 testes passam em ~2 segundos  
# ✅ Validam componentes Angular reais

# Com interface visual do browser
cd frontend && ng test
```

### Todos os Testes (49 total)
```bash
# Terminal 1 - Backend  
cd backend && npm run test

# Terminal 2 - Frontend
cd frontend && ng test --browsers=ChromeHeadless --watch=false
```

### Cobertura de Testes Reais
- ✅ **Enums e constantes** (TaskStatus, UserRole, prioridades)  
- ✅ **Validações DTO** (class-validator real, não mock)
- ✅ **Funções utilitárias** (timestamps, validadores)
- ✅ **Lógica de negócio** (ordenação, agrupamento, transições)
- ✅ **Sistema Kanban** (4 colunas, drag&drop, responsividade)
- ✅ **Autenticação RBAC** (4 níveis hierárquicos)

**Diferencial:** Todos os testes validam **código real** sem mocks problemáticos

---

**Sistema 100% funcional** | **49 testes reais aprovados** | **Zero mocks problemáticos** | Refatorado com metodologia rigorosa
