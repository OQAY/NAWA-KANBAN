import api from './axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Project,
  Task,
  KanbanColumn,
  Comment,
  ProjectMember,
  AddMemberRequest,
  UpdateMemberRequest,
  Organization,
  OrganizationOverview,
} from '../types';

// Auth API
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),

  getProfile: () =>
    api.get<User>('/auth/profile'),
};

// Users API
export const usersApi = {
  getAll: () =>
    api.get<User[]>('/users'),

  getById: (id: string) =>
    api.get<User>(`/users/${id}`),

  update: (id: string, data: Partial<User>) =>
    api.patch<User>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};

// Projects API
export const projectsApi = {
  getAll: () =>
    api.get<Project[]>('/projects'),

  getById: (id: string) =>
    api.get<Project>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data),

  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  // Members
  getMembers: (projectId: string) =>
    api.get<ProjectMember[]>(`/projects/${projectId}/members`),

  addMember: (projectId: string, data: AddMemberRequest) =>
    api.post<ProjectMember>(`/projects/${projectId}/members`, data),

  updateMember: (projectId: string, memberId: string, data: UpdateMemberRequest) =>
    api.patch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, data),

  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),
};

// Tasks API
export const tasksApi = {
  getAll: (params?: { projectId?: string; status?: string; search?: string }) =>
    api.get<Task[]>('/tasks', { params }),

  getById: (id: string) =>
    api.get<Task>(`/tasks/${id}`),

  create: (data: Partial<Task>) =>
    api.post<Task>('/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`),

  search: (query: string) =>
    api.get<Task[]>(`/tasks/search?query=${encodeURIComponent(query)}`),
};

// Columns API
export const columnsApi = {
  getAll: () =>
    api.get<KanbanColumn[]>('/columns'),

  getById: (id: string) =>
    api.get<KanbanColumn>(`/columns/${id}`),

  create: (data: Partial<KanbanColumn>) =>
    api.post<KanbanColumn>('/columns', data),

  update: (id: string, data: Partial<KanbanColumn>) =>
    api.patch<KanbanColumn>(`/columns/${id}`, data),

  delete: (id: string) =>
    api.delete(`/columns/${id}`),
};

// Organizations API
export const organizationsApi = {
  getAll: () =>
    api.get<Organization[]>('/organizations'),

  getById: (id: string) =>
    api.get<Organization>(`/organizations/${id}`),

  getMyOverview: () =>
    api.get<OrganizationOverview[]>('/organizations/my-overview'),

  getOverview: (id: string) =>
    api.get<OrganizationOverview>(`/organizations/${id}/overview`),

  create: (data: { name: string; description?: string; color?: string }) =>
    api.post<Organization>('/organizations', data),

  update: (id: string, data: Partial<Organization>) =>
    api.patch<Organization>(`/organizations/${id}`, data),

  delete: (id: string) =>
    api.delete(`/organizations/${id}`),

  reorder: (orgIds: string[]) =>
    api.patch('/organizations/reorder', { orgIds }),
};

// Comments API
export const commentsApi = {
  getByTaskId: (taskId: string) =>
    api.get<Comment[]>(`/comments/task/${taskId}`),

  create: (data: Partial<Comment>) =>
    api.post<Comment>('/comments', data),

  update: (id: string, data: Partial<Comment>) =>
    api.patch<Comment>(`/comments/${id}`, data),

  delete: (id: string) =>
    api.delete(`/comments/${id}`),
};
