import { useState, useEffect } from 'react';
import type { ActivityLogEntry } from '../types';
import { activityLogApi } from '../api/services';
import { getAvatarColor } from '../utils/dates';
import './ActivityTab.css';

interface ActivityTabProps {
  taskId: string;
}

const ACTION_TEXT: Record<string, string> = {
  created: 'criou esta tarefa',
  updated: 'atualizou a tarefa',
  assigned: 'foi atribuído à tarefa',
  commented: 'adicionou um comentário',
  status_changed: 'moveu a tarefa',
};

export default function ActivityTab({ taskId }: ActivityTabProps) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityLogApi.getByTask(taskId)
      .then(res => setEntries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `há ${days}d`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  if (loading) return <p className="activity-loading">Carregando atividade...</p>;
  if (entries.length === 0) return <p className="activity-empty">Nenhuma atividade registrada</p>;

  return (
    <div className="activity-tab">
      <div className="activity-timeline">
        {entries.map(entry => (
          <div key={entry.id} className="activity-entry">
            <span
              className="activity-avatar"
              style={{ backgroundColor: getAvatarColor(entry.user?.name || '?') }}
            >
              {(entry.user?.name || '?').charAt(0).toUpperCase()}
            </span>
            <div className="activity-content">
              <span className="activity-text">
                <strong>{entry.user?.name || 'Sistema'}</strong>
                {' '}{ACTION_TEXT[entry.action] || entry.action}
              </span>
              <span className="activity-time">{formatTime(entry.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
