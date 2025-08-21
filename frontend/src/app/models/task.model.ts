// NASA STANDARD: Task model < 60 lines, enterprise-grade
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  TESTING = 'testing',
  DONE = 'done'
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly projectId: string;
  readonly assigneeId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Google STANDARD: Clear, specific DTOs
export interface CreateTaskRequest {
  readonly title: string;
  readonly description: string;
  readonly priority: TaskPriority;
  readonly projectId: string;
  readonly assigneeId?: string;
}

export interface UpdateTaskRequest {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly assigneeId?: string | null;
}

export interface TaskQueryParams {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly projectId?: string;
  readonly assigneeId?: string;
}

// NASA STANDARD: Fail-fast validation helpers
export function validateTaskStatus(status: string): TaskStatus {
  const validStatuses = Object.values(TaskStatus);
  if (!validStatuses.includes(status as TaskStatus)) {
    throw new Error(`Invalid task status: ${status}`);
  }
  return status as TaskStatus;
}