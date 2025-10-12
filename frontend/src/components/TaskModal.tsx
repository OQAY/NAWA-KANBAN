/**
 * TaskModal Component
 * Modal for creating and editing tasks
 */

import type { Task, KanbanColumn } from '../types';
import { PRIORITY_OPTIONS } from '../constants';
import './TaskModal.css';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  columns: KanbanColumn[];
  title: string;
  description: string;
  priority: number;
  status: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: number) => void;
  onStatusChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function TaskModal({
  isOpen,
  editingTask,
  columns,
  title,
  description,
  priority,
  status,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onStatusChange,
  onSave,
  onClose,
}: TaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            autoFocus
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            placeholder="Enter task description (optional)"
          />
        </div>

        <div className="form-group">
          <label>Priority</label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(Number(e.target.value))}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {editingTask && columns.length > 0 && (
          <div className="form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onSave} className="btn-primary" disabled={!title.trim()}>
            {editingTask ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
