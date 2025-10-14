/**
 * Custom hook for managing task form state
 * Encapsulates form logic and validation
 */

import { useState } from 'react';
import type { Task } from '../types';
import { PRIORITY } from '../constants';

interface UseTaskFormProps {
  initialTask?: Task | null;
  initialColumnId?: string;
}

export const useTaskForm = ({ initialTask, initialColumnId }: UseTaskFormProps = {}) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority ?? PRIORITY.NONE);
  const [status, setStatus] = useState(initialTask?.status || initialColumnId || '');

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority(PRIORITY.NONE);
    setStatus('');
  };

  const loadTask = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
  };

  const getFormData = () => ({
    title: title.trim(),
    description: description.trim(),
    priority,
    status,
  });

  const isValid = () => {
    return title.trim().length > 0;
  };

  return {
    // Form values
    title,
    description,
    priority,
    status,

    // Setters
    setTitle,
    setDescription,
    setPriority,
    setStatus,

    // Actions
    reset,
    loadTask,
    getFormData,
    isValid,
  };
};
