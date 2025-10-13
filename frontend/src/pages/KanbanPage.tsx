import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '../stores/kanbanStore';
import { projectsApi, tasksApi, columnsApi } from '../api/services';
import type { Task } from '../types';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTaskForm } from '../hooks/useTaskForm';
import { useDebounce } from '../hooks/useDebounce';
import { useToastContext } from '../contexts/ToastContext';
import { getPriorityColor, getPriorityLabel } from '../utils';
import { DEFAULT_COLUMNS } from '../constants';
import './KanbanPage.css';

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();

  const { currentProject, tasks, columns, setCurrentProject, setTasks, setColumns, addTask, updateTask, deleteTask } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });

  // Use custom hook for form state management
  const taskForm = useTaskForm();

  // Debounce search query to avoid excessive re-renders
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const [projectRes, tasksRes, columnsRes] = await Promise.all([
        projectsApi.getById(projectId),
        tasksApi.getAll({ projectId }),
        columnsApi.getAll(),
      ]);

      setCurrentProject(projectRes.data);
      setTasks(tasksRes.data);
      setColumns(columnsRes.data);
    } catch (error) {
      console.error('Failed to load project data:', error);
      toast.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [projectId, setCurrentProject, setTasks, setColumns, toast]);

  const handleCreateTask = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setEditingTask(null);
    taskForm.reset();
    setShowTaskModal(true);
  }, [taskForm]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    taskForm.loadTask(task);
    setShowTaskModal(true);
  }, [taskForm]);

  const handleSaveTask = useCallback(async () => {
    if (!taskForm.isValid() || !projectId) return;

    try {
      const formData = taskForm.getFormData();

      if (editingTask) {
        const response = await tasksApi.update(editingTask.id, {
          ...formData,
          status: formData.status || editingTask.status,
        });
        updateTask(editingTask.id, response.data);
        toast.success('Task updated successfully');
      } else {
        const response = await tasksApi.create({
          ...formData,
          status: selectedColumnId,
          projectId,
        });
        addTask(response.data);
        toast.success('Task created successfully');
      }

      setShowTaskModal(false);
      taskForm.reset();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    }
  }, [taskForm, editingTask, projectId, selectedColumnId, updateTask, addTask, toast]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setDeleteConfirm({ isOpen: true, taskId });
  }, []);

  const confirmDelete = useCallback(async () => {
    const taskId = deleteConfirm.taskId;
    if (!taskId) return;

    try {
      await tasksApi.delete(taskId);
      deleteTask(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeleteConfirm({ isOpen: false, taskId: null });
    }
  }, [deleteConfirm.taskId, deleteTask, toast]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    updateTask(taskId, { ...task, status: newStatus });

    try {
      await tasksApi.update(taskId, { status: newStatus });
      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      updateTask(taskId, task);
      toast.error('Failed to move task');
    }
  }, [tasks, updateTask, toast]);

  // Use default columns if user hasn't created custom ones
  const displayColumns = useMemo(() =>
    columns.length > 0 ? columns : DEFAULT_COLUMNS,
    [columns]
  );

  // Filter tasks with memoization for performance
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        task.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, debouncedSearch, filterStatus, filterPriority]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading board..." />;
  }

  return (
    <div className="kanban-container">
      {/* Header */}
      <header className="kanban-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back
          </button>
          <h1>{currentProject?.name || 'Kanban Board'}</h1>
        </div>

        {/* Search and Filters */}
        <div className="header-filters">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            {displayColumns.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value={3}>High</option>
            <option value={2}>Medium</option>
            <option value={1}>Low</option>
            <option value={0}>None</option>
          </select>
        </div>
      </header>

      {/* Kanban Board with Drag & Drop */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {displayColumns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id || t.status === column.name);
            const taskIds = columnTasks.map(t => t.id);

            return (
              <div key={column.id} className="kanban-column">
                <div className="column-header">
                  <h3>{column.name}</h3>
                  <span className="task-count">{columnTasks.length}</span>
                </div>

                <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={column.id}>
                  <div className="column-tasks" data-column-id={column.id}>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                      />
                    ))}
                  </div>
                </SortableContext>

                <button onClick={() => handleCreateTask(column.id)} className="btn-add-task">
                  + Add Task
                </button>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="task-card task-card-dragging">
              <div className="task-header">
                <h4>{activeTask.title}</h4>
              </div>
              {activeTask.description && (
                <p className="task-description">{activeTask.description}</p>
              )}
              <div className="task-footer">
                <span
                  className="task-priority"
                  style={{ backgroundColor: getPriorityColor(activeTask.priority) }}
                >
                  {getPriorityLabel(activeTask.priority)}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        editingTask={editingTask}
        columns={displayColumns}
        title={taskForm.title}
        description={taskForm.description}
        priority={taskForm.priority}
        status={taskForm.status}
        onTitleChange={taskForm.setTitle}
        onDescriptionChange={taskForm.setDescription}
        onPriorityChange={taskForm.setPriority}
        onStatusChange={taskForm.setStatus}
        onSave={handleSaveTask}
        onClose={() => setShowTaskModal(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, taskId: null })}
      />
    </div>
  );
}
