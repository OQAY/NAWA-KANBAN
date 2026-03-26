import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCorners, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '../stores/kanbanStore';
import { projectsApi, tasksApi, columnsApi } from '../api/services';
import type { Task, ProjectMember } from '../types';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareBoardModal from '../components/ShareBoardModal';
import { useDebounce } from '../hooks/useDebounce';
import { useToastContext } from '../contexts/ToastContext';
import { getPriorityColor, getPriorityLabel } from '../utils';
import { DEFAULT_COLUMNS } from '../constants/columns';
import { ShareIcon, SearchIcon, PlusIcon } from '../components/icons/Icons';
import './KanbanPage.css';

// Droppable area component for empty columns
function DroppableArea({ columnId, children }: { columnId: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: columnId });
  return <div ref={setNodeRef} className="column-tasks">{children}</div>;
}

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();

  const { currentProject, tasks, columns, setCurrentProject, setTasks, setColumns, addTask, updateTask, deleteTask } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Debounce search query to avoid excessive re-renders
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Configure drag sensors with activation delay to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px movement before drag starts (allows clicks)
      },
    })
  );

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;

    // Only show full loading spinner on initial load, not on refreshes
    if (isInitialLoad) setLoading(true);
    try {
      const [projectRes, tasksRes, columnsRes] = await Promise.all([
        projectsApi.getById(projectId),
        tasksApi.getAll({ projectId }),
        columnsApi.getAll(),
      ]);

      // Tasks API returns paginated response: { data: [...], total, page, limit }
      const tasksArray = tasksRes.data?.data || tasksRes.data || [];
      const finalTasks = Array.isArray(tasksArray) ? tasksArray : [];

      setCurrentProject(projectRes.data);
      setTasks(finalTasks);
      setColumns(Array.isArray(columnsRes.data) ? columnsRes.data : []);
    } catch (error) {
      console.error('Failed to load project data:', error);
      toast.error('Failed to load board');
      setTasks([]);
      setColumns([]);
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [projectId, isInitialLoad, setCurrentProject, setTasks, setColumns, toast]);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId, loadProjectData]);

  // Load project members for assignee filter
  useEffect(() => {
    if (!projectId) return;
    projectsApi.getMembers(projectId)
      .then((res) => setProjectMembers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjectMembers([]));
  }, [projectId]);

  // Refresh board when AI makes changes
  useEffect(() => {
    const handleBoardUpdate = () => loadProjectData();
    window.addEventListener('ai-board-updated', handleBoardUpdate);
    return () => window.removeEventListener('ai-board-updated', handleBoardUpdate);
  }, [loadProjectData]);

  const handleCreateTask = useCallback((columnStatus: string) => {
    setSelectedColumnId(columnStatus);
    setEditingTask(null);
    setShowTaskModal(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  }, []);

  // Use ref to avoid stale closure on editingTask
  const editingTaskRef = useRef(editingTask);
  useEffect(() => { editingTaskRef.current = editingTask; }, [editingTask]);

  const handleTaskSaved = useCallback((task: Task) => {
    if (editingTaskRef.current) {
      updateTask(editingTaskRef.current.id, task);
    } else {
      addTask(task);
    }
    setShowTaskModal(false);
  }, [updateTask, addTask]);

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
    const task = Array.isArray(tasks) ? tasks.find(t => t.id === active.id) : null;
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over || active.id === over.id || isSavingOrder) {
      return;
    }

    const taskId = active.id as string;
    const task = Array.isArray(tasks) ? tasks.find(t => t.id === taskId) : null;
    if (!task) {
      return;
    }

    let newStatus: string;
    let newPosition: number;

    // Check if we dropped over a task or a column
    const droppedOverTask = Array.isArray(tasks) ? tasks.find(t => t.id === over.id) : null;

    if (droppedOverTask) {
      // Dropped over a task - use the dropped task's actual position
      newStatus = droppedOverTask.status;

      // Use the actual position of the task we dropped over
      // This is the position where we want to insert the dragged task
      newPosition = droppedOverTask.position || 0;

    } else {
      // Dropped over a column (not over a specific task) - insert at end
      // Try to find column in custom columns
      const targetColumn = Array.isArray(columns) ? columns.find(c => c.id === over.id) : null;

      if (targetColumn) {
        newStatus = targetColumn.status;
      } else {
        // Try default columns
        const defaultColumn = DEFAULT_COLUMNS.find(c => c.id === over.id);
        if (defaultColumn) {
          newStatus = defaultColumn.status;
        } else {
          // Fallback: try to match by status directly
          const allColumns = [...(Array.isArray(columns) ? columns : []), ...DEFAULT_COLUMNS];
          const matchedColumn = allColumns.find(c => c.status === over.id);
          newStatus = matchedColumn ? matchedColumn.status : over.id as string;
        }
      }

      // Insert at end of column (works for empty columns too)
      const columnTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === newStatus && t.id !== taskId) : [];
      newPosition = columnTasks.length;
    }

    // Optimistic UI update - reorder all tasks in both old and new columns
    const updatedTasks = Array.isArray(tasks) ? [...tasks] : [];
    const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const oldStatus = task.status;
    const movedTask = updatedTasks[taskIndex];

    // Step 1: Get all tasks in the NEW column (excluding the moved task)
    let newColumnTasks = updatedTasks.filter(t =>
      t.status === newStatus && t.id !== taskId
    ).sort((a, b) => (a.position || 0) - (b.position || 0));

    // Step 2: Insert the moved task at the new position
    newColumnTasks.splice(newPosition, 0, { ...movedTask, status: newStatus });

    // Step 3: Reassign sequential positions (0, 1, 2, 3...)
    newColumnTasks.forEach((t, index) => {
      const idx = updatedTasks.findIndex(ut => ut.id === t.id);
      if (idx !== -1) {
        updatedTasks[idx] = { ...updatedTasks[idx], status: newStatus, position: index };
      }
    });

    // Step 4: If status changed, recalculate positions for the OLD column too
    if (oldStatus !== newStatus) {
      const oldColumnTasks = updatedTasks
        .filter(t => t.status === oldStatus)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      oldColumnTasks.forEach((t, index) => {
        const idx = updatedTasks.findIndex(ut => ut.id === t.id);
        if (idx !== -1) {
          updatedTasks[idx] = { ...updatedTasks[idx], position: index };
        }
      });
    }

    // Update store with new task order (optimistic update)
    setTasks(updatedTasks);
    setIsSavingOrder(true);

    try {
      // Send batch updates to backend for all affected tasks
      // Only update tasks that changed position to minimize requests
      const tasksToUpdate = updatedTasks.filter((t) => {
        const original = tasks.find((ot) => ot.id === t.id);
        return original && (original.position !== t.position || original.status !== t.status);
      });

      // Limit to max 10 concurrent updates to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < tasksToUpdate.length; i += batchSize) {
        const batch = tasksToUpdate.slice(i, i + batchSize);
        await Promise.all(
          batch.map((t) =>
            tasksApi.update(t.id, {
              status: t.status,
              position: t.position,
            })
          )
        );
      }

      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      setTasks(tasks);
      toast.error('Failed to move task');
    } finally {
      setIsSavingOrder(false);
    }
  }, [tasks, columns, setTasks, toast, isSavingOrder]);

  // Use default columns if user hasn't created custom ones
  const displayColumns = useMemo(() => {
    if (!Array.isArray(columns)) {
      return DEFAULT_COLUMNS;
    }
    return columns.length > 0 ? columns : DEFAULT_COLUMNS;
  }, [columns]);

  // Filter tasks with memoization for performance
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

    return tasks
      .filter(task => {
        const matchesSearch =
          task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          task.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        const matchesAssignee = filterAssignee === 'all' || task.assigneeId === filterAssignee;

        let matchesDueDate = true;
        if (filterDueDate !== 'all') {
          if (filterDueDate === 'no_date') {
            matchesDueDate = !task.dueDate;
          } else if (filterDueDate === 'overdue') {
            matchesDueDate = !!task.dueDate && new Date(task.dueDate) < today;
          } else if (filterDueDate === 'today') {
            if (!task.dueDate) { matchesDueDate = false; }
            else {
              const due = new Date(task.dueDate);
              due.setHours(0, 0, 0, 0);
              matchesDueDate = due.getTime() === today.getTime();
            }
          } else if (filterDueDate === 'this_week') {
            if (!task.dueDate) { matchesDueDate = false; }
            else {
              const due = new Date(task.dueDate);
              matchesDueDate = due >= today && due <= endOfWeek;
            }
          }
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDueDate;
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [tasks, debouncedSearch, filterStatus, filterPriority, filterAssignee, filterDueDate]);

  // Count active filters for clear button
  const activeFilterCount = [filterStatus, filterPriority, filterAssignee, filterDueDate]
    .filter(f => f !== 'all').length;

  const clearAllFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterAssignee('all');
    setFilterDueDate('all');
    setSearchQuery('');
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading board..." />;
  }

  return (
    <div className="kanban-container">
      {/* Header */}
      <header className="kanban-header">
        <div className="header-left">
          <button onClick={() => navigate('/overview')} className="btn-back">
            ← Back
          </button>
          <h1>{currentProject?.name || 'Kanban Board'}</h1>
          <button
            onClick={() => setShowShareModal(true)}
            className="btn-share"
            aria-label="Share board"
          >
            <ShareIcon size={18} />
            <span>Share</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="header-filters">
          <div className="search-wrapper">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            {displayColumns.map(col => (
              <option key={col.id} value={col.status}>{col.name}</option>
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

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Assignees</option>
            {projectMembers.map(m => (
              <option key={m.userId} value={m.userId}>{m.user?.name || m.userId}</option>
            ))}
          </select>

          <select
            value={filterDueDate}
            onChange={(e) => setFilterDueDate(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Dates</option>
            <option value="overdue">Atrasadas</option>
            <option value="today">Hoje</option>
            <option value="this_week">Esta semana</option>
            <option value="no_date">Sem data</option>
          </select>

          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="btn-clear-filters">
              Limpar ({activeFilterCount})
            </button>
          )}
        </div>
      </header>

      {/* Kanban Board with Drag & Drop */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className="kanban-board">
          {displayColumns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.status);
            const taskIds = columnTasks.map(t => t.id);

            return (
              <div key={column.id} className="kanban-column">
                <div className="column-header">
                  <h3>{column.name}</h3>
                  <span className="task-count">{columnTasks.length}</span>
                </div>

                <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={column.id}>
                  <DroppableArea columnId={column.id}>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onClick={handleEditTask}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                      />
                    ))}
                  </DroppableArea>
                </SortableContext>

                <button onClick={() => handleCreateTask(column.status)} className="btn-add-task">
                  <PlusIcon size={16} />
                  <span>Add Task</span>
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
        projectId={projectId!}
        initialStatus={selectedColumnId}
        onClose={() => setShowTaskModal(false)}
        onTaskSaved={handleTaskSaved}
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

      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        project={currentProject}
        onClose={() => setShowShareModal(false)}
      />

    </div>
  );
}
