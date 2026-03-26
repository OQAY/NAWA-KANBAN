---
stepsCompleted: [1, 2, 3]
inputDocuments: ['NAWA-KANBAN repo analysis']
session_topic: 'IA-KANBA: AI-Powered Kanban with Voice Assistant'
session_goals: 'Create an intelligent Kanban system with Gemini AI integration, voice chat interface, and real-time AI assistant capabilities'
selected_approach: 'AI-Recommended (fast-track to tech spec)'
techniques_used: ['First Principles Thinking', 'Analogical Thinking', 'Resource Constraints']
ideas_generated: ['voice-driven task management', 'AI secretary pattern', 'NAWA-KANBAN as base', 'Docker-first local dev']
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Oqay
**Date:** 2026-03-12

## Session Overview

**Topic:** IA-KANBA — Sistema Kanban inteligente com assistente IA por voz
**Goals:** Criar um Kanban com integração Gemini AI que funciona como secretário pessoal, acessando dados em tempo real e organizando tarefas via chat/voz

### Session Setup

- **Base:** NAWA-KANBAN (repo próprio do Oqay — React 19 + NestJS 11 + TypeScript)
- **AI Engine:** Google Gemini API (key configurada)
- **Deploy:** Local com Docker (PostgreSQL + Backend + Frontend)
- **Input:** Voz (já usa microfone no Claude Code) + texto

---

## Research Phase

### NAWA-KANBAN Analysis (Own Repo)

**Stack:** React 19.1 | NestJS 11 | TypeScript 5.9 | Vite 7.1 | Zustand | @dnd-kit | PostgreSQL

**Features existentes:**
- Kanban completo com drag & drop
- Autenticação JWT
- CRUD de boards, columns, tasks, comments
- Board sharing com roles (Admin/Manager/Developer/Viewer)
- Busca e filtros
- Testes E2E (Playwright) + Unit (Vitest/Jest)
- Responsive design

**Gaps para IA-KANBA:**
- ❌ Sem Docker
- ❌ Sem integração AI
- ❌ Sem interface de chat/voz
- ❌ Sem WebSocket/real-time updates

### Public Kanban Alternatives Evaluated

| Projeto | Stars | Stack | Docker | Veredicto |
|---------|-------|-------|--------|-----------|
| Kan (kanbn/kan) | ~4k | Next.js + tRPC + Turborepo | ✅ | Moderno mas recomeçar do zero |
| Planka | ~11.6k | React + Redux-Saga + Sails.js | ✅ | Stack mais antigo |
| Focalboard | ~22k | Go + React | ✅ | Backend Go dificulta integração JS |
| WeKan | ~20.8k | Meteor (legacy) | ✅ | Stack legado |

### Decision: Use NAWA-KANBAN as Base

**Rationale:**
1. Oqay já conhece o código (é dele)
2. Stack moderna e idêntica ao que precisa (React + NestJS + TS)
3. Já tem features completas de Kanban
4. NestJS facilita adicionar módulo Gemini AI
5. Só precisa: Docker + AI module + Chat UI + WebSocket

---

## Architecture Concept (First Principles)

### Core Architecture

```
┌─────────────────────────────────────────────────┐
│                  DOCKER COMPOSE                  │
├──────────┬──────────┬──────────┬────────────────┤
│ Frontend │ Backend  │ Postgres │   Redis        │
│ React 19 │ NestJS   │   15     │ (sessions +    │
│ Vite     │ + Gemini │          │  pub/sub)      │
│ :5173    │ :3000    │ :5432    │  :6379         │
└──────────┴──────────┴──────────┴────────────────┘
```

### AI Integration Layer (NestJS Module)

```
backend/src/ai/
├── ai.module.ts          # NestJS module
├── ai.controller.ts      # REST + WebSocket endpoints
├── ai.service.ts         # Gemini API integration
├── ai.gateway.ts         # WebSocket gateway (real-time)
├── prompts/              # System prompts for AI context
│   ├── assistant.prompt.ts
│   └── kanban-context.prompt.ts
└── dto/
    ├── chat-message.dto.ts
    └── ai-response.dto.ts
```

### Voice/Chat Interface (Frontend)

```
frontend/src/components/ai-chat/
├── AIChatPanel.tsx       # Sliding panel with chat
├── VoiceInput.tsx        # Web Speech API / MediaRecorder
├── ChatMessage.tsx       # Message bubbles
├── ChatHistory.tsx       # Conversation history
└── useAIChat.ts          # Hook: WebSocket + state
```

### AI Context Flow

```
User speaks → Browser Speech API → Text
    → WebSocket → NestJS AI Gateway
    → AI Service builds context (current board data, tasks, columns)
    → Gemini API call with full Kanban context
    → AI response (text + actions: create/move/update tasks)
    → WebSocket broadcast → Frontend updates board in real-time
```

### Key AI Capabilities

1. **Natural Language Task Management**: "Cria uma task 'Deploy v2' na coluna In Progress com prioridade alta"
2. **Board Summary**: "Me dá um resumo do que está pendente"
3. **Smart Suggestions**: "O que deveria ser prioridade agora?"
4. **Status Reports**: "Como está o progresso do sprint?"
5. **Bulk Operations**: "Move todas as tasks done para archive"

---

## Ideas Generated

### MVP Features (Phase 1)
1. Docker Compose (PostgreSQL + Backend + Frontend)
2. Gemini AI module no NestJS
3. Chat panel no frontend (texto)
4. Voice-to-text via Web Speech API
5. AI com acesso ao board data em tempo real
6. Actions: criar, mover, editar, deletar tasks via chat

### Phase 2 (Future)
- Text-to-Speech para respostas do AI
- AI proativa (sugestões automáticas)
- Relatórios inteligentes
- Templates de boards via AI
- Integração com calendário

---

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Base: NAWA-KANBAN | Código próprio, stack moderna, features prontas |
| 2 | AI: Gemini API | Key já fornecida, bom para português |
| 3 | Infra: Docker Compose | Requisito do user, facilita setup local |
| 4 | Real-time: WebSocket | Chat precisa ser instantâneo |
| 5 | Voice: Web Speech API | Browser nativo, zero dependências extras |
| 6 | State: Redis | Pub/sub para WebSocket + cache de contexto AI |

---

## Next Steps

→ **Create Tech Spec** (`/bmad:bmm:workflows:create-tech-spec`)
→ Clone NAWA-KANBAN into project
→ Add Docker configuration
→ Implement AI module
→ Build chat interface
