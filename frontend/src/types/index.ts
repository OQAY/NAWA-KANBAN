// User types
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number; // 0=none, 1=low, 2=medium, 3=high
  dueDate?: string;
  projectId: string;
  assigneeId?: string;
  createdById: string;
  columnId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  createdBy?: User;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: User;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

// Column types
export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
  userId: string;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
