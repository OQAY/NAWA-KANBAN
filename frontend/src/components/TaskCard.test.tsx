import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from './TaskCard';
import type { Task, TaskStatus, TaskPriority } from '../types';

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: { role: 'button', tabIndex: 0 },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

// Mock @dnd-kit/utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

describe('TaskCard', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as TaskStatus,
    priority: 2 as TaskPriority,
    projectId: 'project-1',
    createdById: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockGetPriorityColor = vi.fn((priority: number) => {
    const colors: Record<number, string> = {
      1: '#10b981', // low - green
      2: '#f59e0b', // medium - yellow
      3: '#ef4444', // high - red
    };
    return colors[priority] || '#6b7280';
  });
  const mockGetPriorityLabel = vi.fn((priority: number) => {
    const labels: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
    };
    return labels[priority] || 'Unknown';
  });

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockGetPriorityColor.mockClear();
    mockGetPriorityLabel.mockClear();
  });

  it('should render task title', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render task description when provided', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const taskWithoutDescription = { ...mockTask, description: undefined };

    render(
      <TaskCard
        task={taskWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
  });

  it('should call getPriorityLabel with task priority', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(mockGetPriorityLabel).toHaveBeenCalledWith(2);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should call getPriorityColor with task priority', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(mockGetPriorityColor).toHaveBeenCalledWith(2);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    const editButton = screen.getByText('✏️').closest('button')!;
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    const deleteButton = screen.getByText('🗑️').closest('button')!;
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('task-1');
  });

  it('should render with correct CSS classes', () => {
    const { container } = render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(container.querySelector('.task-card')).toBeInTheDocument();
    expect(container.querySelector('.task-header')).toBeInTheDocument();
    expect(container.querySelector('.task-actions')).toBeInTheDocument();
    expect(container.querySelector('.task-description')).toBeInTheDocument();
    expect(container.querySelector('.task-footer')).toBeInTheDocument();
    expect(container.querySelector('.task-priority')).toBeInTheDocument();
  });

  it('should display different priority levels correctly', () => {
    const lowPriorityTask = { ...mockTask, priority: 1 as TaskPriority };

    const { rerender } = render(
      <TaskCard
        task={lowPriorityTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(mockGetPriorityColor).toHaveBeenCalledWith(1);

    const highPriorityTask = { ...mockTask, priority: 3 as TaskPriority };

    rerender(
      <TaskCard
        task={highPriorityTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(mockGetPriorityColor).toHaveBeenCalledWith(3);
  });

  it('should render edit and delete button emojis', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    expect(screen.getByText('✏️')).toBeInTheDocument();
    expect(screen.getByText('🗑️')).toBeInTheDocument();
  });

  it('should have btn-icon class on action buttons', () => {
    const { container } = render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        getPriorityColor={mockGetPriorityColor}
        getPriorityLabel={mockGetPriorityLabel}
      />
    );

    const buttons = container.querySelectorAll('.btn-icon');
    expect(buttons).toHaveLength(2);
  });
});
