# Database Setup Guide

## 📋 Visão Geral

Este projeto usa **PostgreSQL** hospedado no **Supabase**. O arquivo `database-schema.sql` contém todo o schema completo do banco de dados.

## 🚀 Setup Inicial (Primeira Vez)

### Opção 1: Supabase Dashboard (Recomendado)

1. **Acesse seu projeto no Supabase**
   - Vá para: https://supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**

3. **Execute o Schema Completo**
   - Abra o arquivo `database-schema.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor
   - Clique em **RUN** ou pressione `Ctrl+Enter`

4. **Verifique as Tabelas**
   - No menu lateral, clique em **Table Editor**
   - Você deve ver as 6 tabelas criadas:
     - ✅ `users`
     - ✅ `projects`
     - ✅ `kanban_columns`
     - ✅ `tasks`
     - ✅ `comments`
     - ✅ `project_members`

### Opção 2: CLI (psql)

```bash
# Se você tiver psql instalado
psql -h SEU_HOST -p 5432 -U SEU_USUARIO -d postgres -f database-schema.sql
```

## 🗄️ Estrutura do Banco de Dados

### 1. Users (Usuários)
```sql
- id (UUID)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- role (ENUM: admin, manager, developer, viewer)
- board_config (JSONB)
- created_at, updated_at
```

### 2. Projects (Projetos/Boards)
```sql
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- owner_id (UUID) → users.id
- created_at, updated_at
```

### 3. Kanban Columns (Colunas Personalizáveis)
```sql
- id (UUID)
- name (VARCHAR)
- position (INTEGER)
- color (VARCHAR)
- user_id (UUID) → users.id
- created_at, updated_at
```

### 4. Tasks (Tarefas)
```sql
- id (UUID)
- title (VARCHAR)
- description (TEXT)
- status (VARCHAR)
- priority (INTEGER: 0-3)
- due_date (TIMESTAMP)
- project_id (UUID) → projects.id
- assignee_id (UUID) → users.id
- created_by_id (UUID) → users.id
- column_id (UUID) → kanban_columns.id
- created_at, updated_at
```

### 5. Comments (Comentários)
```sql
- id (UUID)
- content (TEXT)
- task_id (UUID) → tasks.id
- user_id (UUID) → users.id
- created_at, updated_at
```

### 6. Project Members (Compartilhamento) 🆕
```sql
- id (UUID)
- project_id (UUID) → projects.id
- user_id (UUID) → users.id
- role (VARCHAR: 'viewer' ou 'editor')
- created_at, updated_at
```

**Roles de Compartilhamento:**
- **Editor** - Pode editar tasks, mover cards, modificar o board
- **Viewer** - Somente visualização, não pode editar

**Obs:** O **Owner/Manager** é sempre o `project.owner_id`

## 🔄 Migrações Futuras

Para adicionar novas tabelas ou modificações:

1. **Crie um novo arquivo de migração**
   ```bash
   # No backend
   cd backend
   npm run migration:generate -- src/database/migrations/NomeDaMigracao
   ```

2. **Execute a migração**
   ```bash
   npm run migration:run
   ```

3. **Reverter migração (se necessário)**
   ```bash
   npm run migration:revert
   ```

## ⚙️ Variáveis de Ambiente

Configure o arquivo `backend/.env` com as credenciais do Supabase:

```env
DB_HOST=seu-host.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.xxxxx
DB_PASSWORD=sua-senha
DB_NAME=postgres
```

## ✅ Verificação

Após executar o schema, verifique se tudo está OK:

```bash
# Inicie o backend
cd backend
npm run start:dev

# Se você ver esta mensagem, está tudo certo:
# "Nest application successfully started"
# "API running on http://localhost:3000"
```

## 🆘 Troubleshooting

### Erro: "relation already exists"
- **Solução**: As tabelas já existem. Você pode ignorar ou usar `DROP TABLE IF EXISTS` antes.

### Erro: "permission denied"
- **Solução**: Verifique se o usuário do banco tem permissões de CREATE TABLE.

### Erro de conexão
- **Solução**: Verifique as credenciais no arquivo `.env`
- Teste a conexão no Supabase Dashboard

## 📚 Recursos

- [Documentação do Supabase](https://supabase.com/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
