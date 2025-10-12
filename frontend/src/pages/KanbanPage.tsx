import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '../stores/kanbanStore';
import { projectsApi, tasksApi, columnsApi } from '../api/services';
import type { Task, KanbanColumn } from '../types';
import TaskCard from '../components/TaskCard';
import './KanbanPage.css';

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { currentProject, tasks, columns, setCurrentProject, setTasks, setColumns, addTask, updateTask, deleteTask } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all');

  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState(0);
  const [taskStatus, setTaskStatus] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
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
      alert('Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority(0);
    setTaskStatus('');
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim() || !projectId) return;

    try {
      if (editingTask) {
        const response = await tasksApi.update(editingTask.id, {
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          status: taskStatus || editingTask.status,
        });
        updateTask(editingTask.id, response.data);
      } else {
        const response = await tasksApi.create({
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          status: selectedColumnId,
          projectId,
        });
        addTask(response.data);
      }

      setShowTaskModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      await tasksApi.delete(taskId);
      deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      updateTask(taskId, task);
      alert('Failed to move task');
    }
  };

  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority(0);
    setTaskStatus('');
    setEditingTask(null);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return '#ef4444';
      case 2: return '#f59e0b';
      case 1: return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return 'High';
      case 2: return 'Medium';
      case 1: return 'Low';
      default: return 'None';
    }
  };

  // Default columns
  const defaultColumns: KanbanColumn[] = [
    { id: 'pending', name: 'To Do', position: 0, userId: '', createdAt: '', updatedAt: '' },
    { id: 'in-progress', name: 'In Progress', position: 1, userId: '', createdAt: '', updatedAt: '' },
    { id: 'review', name: 'Review', position: 2, userId: '', createdAt: '', updatedAt: '' },
    { id: 'done', name: 'Done', position: 3, userId: '', createdAt: '', updatedAt: '' },
  ];

  const displayColumns = columns.length > 0 ? columns : defaultColumns;

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return <div className="kanban-loading">Loading board...</div>;
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
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(Number(e.target.value))}
              >
                <option value={0}>None</option>
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>

            {editingTask && (
              <div className="form-group">
                <label>Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                >
                  {displayColumns.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowTaskModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveTask} className="btn-primary">
                {editingTask ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
