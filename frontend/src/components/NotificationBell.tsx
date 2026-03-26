import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../types';
import { notificationsApi } from '../api/services';
import { useAuthStore } from '../stores/authStore';
import './NotificationBell.css';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    notificationsApi.getAll()
      .then(res => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleClick = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      } catch {}
    }

    setIsOpen(false);

    if (notification.entityType === 'task' && notification.entityId) {
      // Navigate to the board — task modal opening would need additional state
      navigate(`/overview`);
    } else if (notification.entityType === 'project' && notification.entityId) {
      navigate(`/board/${notification.entityId}`);
    }
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notification-bell-wrapper">
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificações"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-backdrop" onClick={() => setIsOpen(false)} />
          <div className="notification-panel">
            <div className="notification-panel-header">
              <strong>Notificações</strong>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="btn-link">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="notification-empty">Nenhuma notificação</p>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="notification-content">
                      <span className="notification-title">{n.title}</span>
                      {n.body && <span className="notification-body">{n.body}</span>}
                    </div>
                    <span className="notification-time">{formatTime(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
