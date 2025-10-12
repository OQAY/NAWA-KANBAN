/**
 * Task Priority Constants
 * Centralized priority definitions for consistency across the app
 */

export const PRIORITY = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

export type PriorityValue = typeof PRIORITY[keyof typeof PRIORITY];

export const PRIORITY_COLORS: Record<PriorityValue, string> = {
  [PRIORITY.HIGH]: '#ef4444',    // Red
  [PRIORITY.MEDIUM]: '#f59e0b',  // Orange
  [PRIORITY.LOW]: '#10b981',     // Green
  [PRIORITY.NONE]: '#6b7280',    // Gray
};

export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  [PRIORITY.HIGH]: 'High',
  [PRIORITY.MEDIUM]: 'Medium',
  [PRIORITY.LOW]: 'Low',
  [PRIORITY.NONE]: 'None',
};

export const PRIORITY_OPTIONS = [
  { value: PRIORITY.NONE, label: PRIORITY_LABELS[PRIORITY.NONE] },
  { value: PRIORITY.LOW, label: PRIORITY_LABELS[PRIORITY.LOW] },
  { value: PRIORITY.MEDIUM, label: PRIORITY_LABELS[PRIORITY.MEDIUM] },
  { value: PRIORITY.HIGH, label: PRIORITY_LABELS[PRIORITY.HIGH] },
];
