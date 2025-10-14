-- =====================================================
-- NAWA KANBAN - Database Schema
-- Complete database setup for first-time installation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'developer',
  board_config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users enum type for role
DO $$ BEGIN
  CREATE TYPE users_role_enum AS ENUM ('admin', 'manager', 'developer', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alter users table to use enum if not already
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN role TYPE users_role_enum USING role::users_role_enum;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Usuários do sistema com autenticação JWT';
COMMENT ON COLUMN users.role IS 'Papel do usuário no sistema: admin, manager, developer, viewer';
COMMENT ON COLUMN users.board_config IS 'Configurações personalizadas do board (JSON)';

-- =====================================================
-- 2. PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_project_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

COMMENT ON TABLE projects IS 'Projetos/Boards do Kanban';
COMMENT ON COLUMN projects.owner_id IS 'Dono do projeto (usuário que criou)';

-- =====================================================
-- 3. KANBAN COLUMNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  color VARCHAR(50),
  user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_column_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_column_position UNIQUE (user_id, position)
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_user_id ON kanban_columns(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON kanban_columns(user_id, position);

COMMENT ON TABLE kanban_columns IS 'Colunas personalizáveis do Kanban (configuradas por usuário)';
COMMENT ON COLUMN kanban_columns.position IS 'Ordem de exibição da coluna';
COMMENT ON COLUMN kanban_columns.color IS 'Cor da coluna (hex ou nome)';

-- =====================================================
-- 4. TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(100) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP,
  project_id UUID NOT NULL,
  assignee_id UUID,
  created_by_id UUID NOT NULL,
  column_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_column FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE SET NULL,
  CONSTRAINT check_priority CHECK (priority >= 0 AND priority <= 3)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

COMMENT ON TABLE tasks IS 'Tasks do Kanban board';
COMMENT ON COLUMN tasks.status IS 'Status da task (dinâmico, baseado nas colunas)';
COMMENT ON COLUMN tasks.priority IS 'Prioridade: 0=none, 1=low, 2=medium, 3=high';
COMMENT ON COLUMN tasks.column_id IS 'Coluna onde a task está posicionada';

-- =====================================================
-- 5. COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_comment_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

COMMENT ON TABLE comments IS 'Comentários nas tasks';

-- =====================================================
-- 6. PROJECT MEMBERS TABLE (Compartilhamento)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_project_member_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

COMMENT ON TABLE project_members IS 'Membros compartilhados do projeto (apenas Editor e Viewer)';
COMMENT ON COLUMN project_members.role IS 'Papel do membro: editor (pode editar) ou viewer (somente visualização)';

-- =====================================================
-- SEED DATA (Optional - Default columns for testing)
-- =====================================================

-- Create default user (password: "admin123")
-- Password hash for "admin123" using bcrypt with salt rounds 10
INSERT INTO users (email, name, password_hash, role)
VALUES (
  'admin@kanban.com',
  'Admin User',
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE 'Tables created: users, projects, kanban_columns, tasks, comments, project_members';
  RAISE NOTICE 'Ready to run: npm run start:dev';
END $$;
