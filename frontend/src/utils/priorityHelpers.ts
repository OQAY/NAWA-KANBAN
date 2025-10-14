/**
 * Priority Helper Functions
 * Reusable utilities for working with task priorities
 */

import { PRIORITY_COLORS, PRIORITY_LABELS, type PriorityValue } from '../constants';

/**
 * Get color for a priority level
 */
export const getPriorityColor = (priority: number): string => {
  return PRIORITY_COLORS[priority as PriorityValue] || PRIORITY_COLORS[0];
};

/**
 * Get label for a priority level
 */
export const getPriorityLabel = (priority: number): string => {
  return PRIORITY_LABELS[priority as PriorityValue] || PRIORITY_LABELS[0];
};

/**
 * Validate if a priority value is valid
 */
export const isValidPriority = (priority: number): boolean => {
  return priority >= 0 && priority <= 3;
};

/**
 * Sort tasks by priority (highest first)
 */
export const sortByPriority = <T extends { priority: number }>(tasks: T[]): T[] => {
  return [...tasks].sort((a, b) => b.priority - a.priority);
};
