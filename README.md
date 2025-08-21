# Kanban Board - Fullstack Application

Sistema de quadro Kanban desenvolvido com NestJS e Angular.

## Tecnologias

**Backend:**
- NestJS com TypeScript
- PostgreSQL
- JWT Authentication
- Docker

**Frontend:**
- Angular
- Material Design
- RxJS

## Estrutura do Projeto

```
/
├── backend/          # API NestJS
├── frontend/         # App Angular
├── docker-compose.yml
└── README.md
```

## Como executar

### Backend
```bash
cd backend
npm install
docker compose up -d postgres
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

## Acesso

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/api/docs  
- **Frontend:** http://localhost:4200

---
Desenvolvido para teste técnico fullstack.