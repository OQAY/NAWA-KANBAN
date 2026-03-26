/**
 * TaskModal Component — Smart Component
 * Manages its own form state, API calls, and comments internally
 */

import { useState, useEffect, useCallback } from 'react';
import type { Task, KanbanColumn, ProjectMember } from '../types';
import { tasksApi, projectsApi } from '../api/services';
import { useAuthStore } from '../stores/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { PRIORITY_OPTIONS } from '../constants';
import { PRIORITY } from '../constants/priorities';
import CommentSection from './CommentSection';
import './TaskModal.css';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  columns: KanbanColumn[];
  projectId: string;
  initialStatus?: string;
  onClose: () => void;
  onTaskSaved: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export default function TaskModal({
  isOpen,
  editingTask,
  columns,
  projectId,
  initialStatus,
  onClose,
  onTaskSaved,
  onTaskDeleted,
}: TaskModalProps) {
  const toast = useToastContext();
  const { user } = useAuthStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(PRIORITY.NONE);
  const [status, setStatus] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Members state
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  // Loading state
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens or editingTask changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(formatDateForInput(editingTask.dueDate));
      setStartDate(formatDateForInput(editingTask.startDate));
      setAssigneeId(editingTask.assigneeId || '');
    } else {
      // New task — reset form
      setTitle('');
      setDescription('');
      setPriority(PRIORITY.NONE);
      setStatus(initialStatus || '');
      setDueDate('');
      setStartDate('');
      setAssigneeId('');
    }
  }, [isOpen, editingTask, initialStatus]);

  // Load project members
  useEffect(() => {
    if (!isOpen || !projectId) return;

    projectsApi.getMembers(projectId)
      .then((res) => setProjectMembers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjectMembers([]));
  }, [isOpen, projectId]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      const payload: Partial<Task> = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: status || initialStatus || '',
        dueDate: dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : undefined,
        startDate: startDate ? new Date(startDate + 'T12:00:00').toISOString() : undefined,
        assigneeId: assigneeId || undefined,
      };

      // Clean undefined fields for PATCH
      if (!payload.dueDate) delete payload.dueDate;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.assigneeId) delete payload.assigneeId;

      let savedTask: Task;

      if (editingTask) {
        // For editing: send null explicitly to clear date/assignee fields
        const updatePayload: Record<string, unknown> = { ...payload };
        if (!dueDate && editingTask.dueDate) updatePayload.dueDate = null;
        if (!startDate && editingTask.startDate) updatePayload.startDate = null;
        if (!assigneeId && editingTask.assigneeId) updatePayload.assigneeId = null;

        const response = await tasksApi.update(editingTask.id, updatePayload as Partial<Task>);
        savedTask = response.data;
        toast.success('Task updated successfully');
      } else {
        const response = await tasksApi.create({ ...payload, projectId });
        savedTask = response.data;
        toast.success('Task created successfully');
      }

      onTaskSaved(savedTask);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  }, [title, description, priority, status, dueDate, startDate, assigneeId, saving, editingTask, projectId, initialStatus, onTaskSaved, onClose, toast]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-modal-smart" onClick={(e) => e.stopPropagation()}>
        <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Enter task description (optional)"
          />
        </div>

        <div className="form-row">
          <div className="form-group form-group-half">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {columns.length > 0 && (
            <div className="form-group form-group-half">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.status}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group form-group-half">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group form-group-half">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Assignee</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Sem responsável</option>
            {projectMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || member.userId}
              </option>
            ))}
          </select>
        </div>

        {/* Comments — only for existing tasks */}
        {editingTask && user && (
          <CommentSection taskId={editingTask.id} currentUserId={user.id} />
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : editingTask ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function formatDateForInput(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}
