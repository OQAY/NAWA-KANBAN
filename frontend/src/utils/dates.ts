/**
 * Date utility functions for task display
 */

export function isDueDateOverdue(isoDate: string): boolean {
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function formatDueDate(isoDate: string): string {
  const due = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === today.getTime()) return 'Hoje';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Amanhã';
  if (dueDay < today) return 'Atrasado';

  return due.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
