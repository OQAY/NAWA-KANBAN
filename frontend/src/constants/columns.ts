/**
 * Default Kanban Columns
 * Fallback columns when user hasn't created custom ones
 */

import type { KanbanColumn } from '../types';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'pending', name: 'To Do', position: 0, userId: '', createdAt: '', updatedAt: '' },
  { id: 'in-progress', name: 'In Progress', position: 1, userId: '', createdAt: '', updatedAt: '' },
  { id: 'review', name: 'Review', position: 2, userId: '', createdAt: '', updatedAt: '' },
  { id: 'done', name: 'Done', position: 3, userId: '', createdAt: '', updatedAt: '' },
];
