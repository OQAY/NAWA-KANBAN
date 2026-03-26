/**
 * Default Kanban Columns
 * Fallback columns when user hasn't created custom ones
 */

import type { KanbanColumn } from '../types';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'pending', name: 'Pendente', status: 'pending', order: 0, userId: '', createdAt: '', updatedAt: '' },
  { id: 'in_progress', name: 'Em Progresso', status: 'in_progress', order: 1, userId: '', createdAt: '', updatedAt: '' },
  { id: 'testing', name: 'Em Teste', status: 'testing', order: 2, userId: '', createdAt: '', updatedAt: '' },
  { id: 'done', name: 'Concluído', status: 'done', order: 3, userId: '', createdAt: '', updatedAt: '' },
];
