import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: number) => string;
  getPriorityLabel: (priority: number) => string;
}

function TaskCard({ task, onEdit, onDelete, getPriorityColor, getPriorityLabel }: TaskCardProps) {
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
    >
      <div className="task-header">
        <h4>{task.title}</h4>
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

      <div className="task-footer">
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
