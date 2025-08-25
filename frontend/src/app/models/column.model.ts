// Column model for dynamic Kanban columns
export interface Column {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly order: number;
  readonly type: string; // Sempre 'normal' agora
  readonly userId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateColumnRequest {
  readonly name: string;
  readonly status: string;
}

export interface UpdateColumnRequest {
  readonly name?: string;
  readonly status?: string;
  readonly order?: number;
}