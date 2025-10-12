import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanbanStore } from '../stores/kanbanStore';
import { projectsApi, tasksApi, columnsApi } from '../api/services';
import type { Task, KanbanColumn } from '../types';
import './KanbanPage.css';

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { currentProject, tasks, columns, setCurrentProject, setTasks, setColumns, addTask, updateTask, deleteTask } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

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
        // Update existing task
        const response = await tasksApi.update(editingTask.id, {
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          status: taskStatus || editingTask.status,
        });
        updateTask(editingTask.id, response.data);
      } else {
        // Create new task
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

  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority(0);
    setTaskStatus('');
    setEditingTask(null);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return '#ef4444'; // high
      case 2: return '#f59e0b'; // medium
      case 1: return '#10b981'; // low
      default: return '#6b7280'; // none
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

  // Default columns if none exist
  const defaultColumns: KanbanColumn[] = [
    { id: 'pending', name: 'To Do', position: 0, userId: '', createdAt: '', updatedAt: '' },
    { id: 'in-progress', name: 'In Progress', position: 1, userId: '', createdAt: '', updatedAt: '' },
    { id: 'review', name: 'Review', position: 2, userId: '', createdAt: '', updatedAt: '' },
    { id: 'done', name: 'Done', position: 3, userId: '', createdAt: '', updatedAt: '' },
  ];

  const displayColumns = columns.length > 0 ? columns : defaultColumns;

  if (loading) {
    return <div className="kanban-loading">Loading board...</div>;
  }

  return (
    <div className="kanban-container">
      {/* Header */}
      <header className="kanban-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Boards
        </button>
        <h1>{currentProject?.name || 'Kanban Board'}</h1>
      </header>

      {/* Kanban Board */}
      <div className="kanban-board">
        {displayColumns.map((column) => {
          const columnTasks = tasks.filter(t => t.status === column.id || t.status === column.name);

          return (
            <div key={column.id} className="kanban-column">
              <div className="column-header">
                <h3>{column.name}</h3>
                <span className="task-count">{columnTasks.length}</span>
              </div>

              <div className="column-tasks">
                {columnTasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <h4>{task.title}</h4>
                      <div className="task-actions">
                        <button onClick={() => handleEditTask(task)} className="btn-icon">✏️</button>
                        <button onClick={() => handleDeleteTask(task.id)} className="btn-icon">🗑️</button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}

                    <div className="task-footer">
                      <span
                        className="task-priority"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCreateTask(column.id)}
                className="btn-add-task"
              >
                + Add Task
              </button>
            </div>
          );
        })}
      </div>

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
