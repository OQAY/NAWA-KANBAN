# 📋 Nawa-Kanban

**Sistema Kanban completo** - Angular 18 + NestJS + PostgreSQL

## 🚀 QUICK START (30 segundos)

### Requisitos
- Node.js 18+

### Rodar o Projeto

```bash
# Clone o repositório
git clone https://github.com/OQAY/NAWA-KANBAN.git
cd NAWA-KANBAN

# Terminal 1 - Backend
cd backend && npm install && npm run start:dev

# Terminal 2 - Frontend  
cd frontend && npm install && ng serve
```

**✅ PRONTO!** Acesse http://localhost:4200

> **Nota:** Banco de dados Supabase já configurado para demonstração!

---

## 📍 URLs do Sistema

- **App**: http://localhost:4200
- **API**: http://localhost:3000
- **Docs**: http://localhost:3000/api/docs

---

## ✨ Funcionalidades

✅ **Kanban Board** - 4 colunas com drag & drop  
✅ **Autenticação JWT** - Login/registro seguro  
✅ **Tasks** - CRUD completo com prioridades  
✅ **Comentários** - Sistema de discussão  
✅ **Responsivo** - Desktop, tablet e mobile  
✅ **Real-time** - Atualizações instantâneas  

---

## 🎯 Comandos Úteis

```bash
# Desenvolvimento
npm run dev:backend   # Backend com hot-reload
npm run dev:frontend  # Frontend com hot-reload

# Testes
npm run test:backend  # 45 testes reais
npm run test:frontend # 4 testes Angular

# Build produção
npm run build         # Compila ambos
```

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
