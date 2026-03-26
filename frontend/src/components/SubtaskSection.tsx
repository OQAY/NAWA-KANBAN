import { useState, useEffect } from 'react';
import type { Task } from '../types';
import { tasksApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import './SubtaskSection.css';

interface SubtaskSectionProps {
  taskId: string;
}

export default function SubtaskSection({ taskId }: SubtaskSectionProps) {
  const toast = useToastContext();
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    tasksApi.getSubtasks(taskId)
      .then(res => setSubtasks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSubtasks([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await tasksApi.createSubtask(taskId, newTitle.trim());
      setSubtasks(prev => [...prev, res.data]);
      setNewTitle('');
    } catch {
      toast.error('Failed to create subtask');
    }
  };

  const handleToggle = async (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'pending' : 'done';
    try {
      const res = await tasksApi.update(subtask.id, { status: newStatus });
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? res.data : s));
    } catch {
      toast.error('Failed to update subtask');
    }
  };

  const total = subtasks.length;
  const done = subtasks.filter(s => s.status === 'done').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return <p className="subtask-loading">Carregando subtarefas...</p>;

  return (
    <div className="subtask-section">
      <div className="subtask-header">
        <h3>Subtarefas</h3>
        {total > 0 && <span className="subtask-progress-text">{done}/{total}</span>}
      </div>

      {total > 0 && (
        <div className="subtask-progress-bar">
          <div
            className={`subtask-progress-fill ${progress === 100 ? 'complete' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="subtask-list">
        {subtasks.map(sub => (
          <div key={sub.id} className={`subtask-item ${sub.status === 'done' ? 'done' : ''}`}>
            <input
              type="checkbox"
              checked={sub.status === 'done'}
              onChange={() => handleToggle(sub)}
            />
            <span className="subtask-title">{sub.title}</span>
          </div>
        ))}
      </div>

      <div className="subtask-add">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Adicionar subtarefa..."
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button onClick={handleAdd} className="btn-primary btn-sm" disabled={!newTitle.trim()}>
          +
        </button>
      </div>
    </div>
  );
}
