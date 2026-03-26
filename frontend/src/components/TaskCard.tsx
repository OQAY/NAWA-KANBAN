import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { isDueDateOverdue, formatDueDate, getAvatarColor } from '../utils/dates';
import './Labels.css';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClick?: (task: Task) => void;
  getPriorityColor: (priority: number) => string;
  getPriorityLabel: (priority: number) => string;
}

function TaskCard({ task, onEdit, onDelete, onClick, getPriorityColor, getPriorityLabel }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      role="article"
      aria-label={`Task: ${task.title}`}
      onClick={(e) => {
        // Only trigger onClick if not clicking on buttons
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          onClick?.(task);
        }
      }}
    >
      <div className="task-header">
        <div className="task-header-left">
          <div className="drag-handle" aria-label="Drag to move task" title="Drag to move">
            ⋮⋮
          </div>
          <h4>{task.title}</h4>
        </div>
        <div className="task-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="btn-icon"
            aria-label={`Edit task: ${task.title}`}
            title="Edit task"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="btn-icon"
            aria-label={`Delete task: ${task.title}`}
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="task-labels">
          {task.labels.slice(0, 3).map(label => (
            <span
              key={label.id}
              className="label-badge"
              style={{ backgroundColor: label.color + '22', color: label.color, borderColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="label-badge label-more">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      <div className="task-footer">
        {task.assignee && (
          <span
            className="task-assignee-avatar"
            title={task.assignee.name}
            style={{ backgroundColor: getAvatarColor(task.assignee.name) }}
          >
            {task.assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
        {task.dueDate && (
          <span className={`task-due-date ${isDueDateOverdue(task.dueDate) ? 'overdue' : ''}`}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        <span
          className="task-priority"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
          role="status"
          aria-label={`Priority: ${getPriorityLabel(task.priority)}`}
        >
          {getPriorityLabel(task.priority)}
        </span>
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(TaskCard);
