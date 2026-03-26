export interface AiAction {
  action: 'create_task' | 'move_task' | 'update_task' | 'delete_task';
  params: Record<string, any>;
}

export interface AiResponse {
  text: string;
  actions?: AiAction[];
}

export interface ChatResponse {
  text: string;
  actions?: AiAction[];
  executedActions?: ExecutedAction[];
  timestamp: string;
}

export interface ExecutedAction {
  action: string;
  success: boolean;
  result?: any;
  error?: string;
}
