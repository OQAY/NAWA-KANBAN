/**
 * Default Kanban Columns
 * Fallback columns when user hasn't created custom ones
 */

import type { KanbanColumn } from '../types';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'pending', name: 'Pendente', status: 'pending', position: 0, userId: '', createdAt: '', updatedAt: '' },
  { id: 'in_progress', name: 'Em Progresso', status: 'in_progress', position: 1, userId: '', createdAt: '', updatedAt: '' },
  { id: 'testing', name: 'Em Teste', status: 'testing', position: 2, userId: '', createdAt: '', updatedAt: '' },
  { id: 'done', name: 'Concluído', status: 'done', position: 3, userId: '', createdAt: '', updatedAt: '' },
];
