# 📋 Nawa-Kanban

Sistema Kanban fullstack com Angular 18 + NestJS

![Angular](https://img.shields.io/badge/Angular-18-red.svg)
![NestJS](https://img.shields.io/badge/NestJS-10-ea2845.svg)
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

- NestJS 10 + TypeORM + PostgreSQL
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

```bash
# Backend
cd backend && npm run test

# Frontend
cd frontend && ng test cd
```

---
