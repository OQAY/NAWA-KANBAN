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

### Backend

```bash
cd backend
npm install

# Configure .env file (see .env.example)
# Set up PostgreSQL connection

npm run start:dev
# API: http://localhost:3000
# Docs: http://localhost:3000/api/docs
```

### Frontend

```bash
cd frontend
npm install
ng serve
# App: http://localhost:4200
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
# ✅ Todos os testes passam e validam comportamento real
# ✅ Sem mocks problemáticos que dão falsos positivos
```

**Suítes de Teste:**
```bash
# Testes específicos por área
cd backend && npm run test -- app.service.spec.ts          # 3 tests  
cd backend && npm run test -- create-task.dto.spec.ts      # 7 tests
cd backend && npm run test -- task-validation.spec.ts      # 5 tests  
cd backend && npm run test -- time-utils.spec.ts           # 7 tests
cd backend && npm run test -- tasks.controller.spec.ts     # 7 tests
cd backend && npm run test -- test-suite.spec.ts           # 16 tests
```

### Frontend  
```bash
cd frontend && ng test
# Testes unitários dos components Angular
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

**Sistema 100% funcional** | **45 testes reais aprovados (zero mocks)** | Refatorado com metodologia rigorosa
