import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { organizationsApi } from '../api/services';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardIcon } from '../components/icons/Icons';
import type { OrganizationOverview, OrganizationOverviewTask } from '../types';
import './TimelinePage.css';

const ORG_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#ec4899', '#14b8a6'];

function daysBetween(a: Date, b: Date) {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function formatDayLabel(d: Date) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${days[d.getDay()]}`;
}

function formatShortDay(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(startDate: Date, endDate: Date) {
  const diff = daysBetween(startDate, endDate);
  if (diff === 0) return '< 1d';
  if (diff === 1) return '1 dia';
  return `${diff} dias`;
}

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  barStart: number; // column index (0-based)
  barEnd: number;   // column index (0-based, inclusive)
  startDate: Date;
  endDate: Date;
  projectName: string;
  orgName: string;
  orgColor: string;
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);

  const loadData = useCallback(async () => {
    try {
      const response = await organizationsApi.getMyOverview();
      setOrgs(response.data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build 15-day window centered around today
  const { days, todayIndex } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Show 5 days before today and 9 days after = 15 days total
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 5);

    const daysArr: Date[] = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(startDay);
      d.setDate(d.getDate() + i);
      daysArr.push(d);
    }
    return { days: daysArr, todayIndex: 5 };
  }, []);

  const windowStart = days[0];
  const windowEnd = days[days.length - 1];

  // Build timeline tasks from all orgs
  const timelineData = useMemo(() => {
    const result: { orgName: string; orgColor: string; projects: { name: string; id: string; tasks: TimelineTask[] }[] }[] = [];

    orgs.forEach((org, orgIdx) => {
      const orgColor = ORG_COLORS[orgIdx % ORG_COLORS.length];
      const projects: { name: string; id: string; tasks: TimelineTask[] }[] = [];

      org.projects.forEach((project) => {
        const tasks: TimelineTask[] = [];

        project.tasks.forEach((task) => {
          // Determine task start: startDate > createdAt > fallback to today
          const taskStart = task.startDate
            ? new Date(task.startDate)
            : task.createdAt
              ? new Date(task.createdAt)
              : new Date();
          taskStart.setHours(0, 0, 0, 0);

          // Determine task end: completedAt > dueDate > startDate + 1 day
          const taskEnd = task.status === 'done' && task.completedAt
            ? new Date(task.completedAt)
            : task.dueDate
              ? new Date(task.dueDate)
              : new Date(taskStart.getTime() + 86400000);
          taskEnd.setHours(0, 0, 0, 0);

          // Check if task overlaps with our 15-day window
          if (taskEnd < windowStart || taskStart > windowEnd) return;

          // Calculate bar positions (clamped to window)
          const clampedStart = taskStart < windowStart ? windowStart : taskStart;
          const clampedEnd = taskEnd > windowEnd ? windowEnd : taskEnd;

          const barStart = daysBetween(windowStart, clampedStart);
          const barEnd = daysBetween(windowStart, clampedEnd);

          tasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            barStart: Math.max(0, barStart),
            barEnd: Math.min(14, barEnd),
            startDate: taskStart,
            endDate: taskEnd,
            projectName: project.name,
            orgName: org.name,
            orgColor,
          });
        });

        if (tasks.length > 0) {
          projects.push({ name: project.name, id: project.id, tasks });
        }
      });

      if (projects.length > 0) {
        result.push({ orgName: org.name, orgColor, projects });
      }
    });

    return result;
  }, [orgs, windowStart, windowEnd]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Carregando timeline..." />;
  }

  return (
    <div className="timeline-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <ClipboardIcon size={28} />
            </div>
            <div className="header-title">
              <h1>Timeline Overview</h1>
              <p className="header-subtitle">
                Historico de 15 dias - Quanto tempo cada tarefa levou
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-nav" onClick={() => navigate('/overview')}>
              Overview
            </button>
            <button className="btn-nav" onClick={() => navigate('/overview')}>
              Boards
            </button>
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user?.name}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="tl-content">
        {/* Legend */}
        <div className="tl-legend">
          <div className="tl-legend-item">
            <div className="tl-legend-box tl-bar-done" />
            <span>Concluido</span>
          </div>
          <div className="tl-legend-item">
            <div className="tl-legend-box tl-bar-progress" />
            <span>Em progresso</span>
          </div>
          <div className="tl-legend-item">
            <div className="tl-legend-box tl-bar-pending" />
            <span>Pendente</span>
          </div>
          <div className="tl-legend-item">
            <div className="tl-legend-box tl-bar-overdue" />
            <span>Atrasado</span>
          </div>
          <div className="tl-legend-item">
            <div className="tl-today-marker-legend" />
            <span>Hoje</span>
          </div>
        </div>

        <div className="tl-chart">
          {/* Day headers */}
          <div className="tl-row tl-header-row">
            <div className="tl-label-cell tl-header-label">Empresa / Projeto / Tarefa</div>
            {days.map((day, i) => {
              const isToday = i === todayIndex;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`tl-day-header ${isToday ? 'tl-today' : ''} ${isWeekend ? 'tl-weekend' : ''}`}
                >
                  <span className="tl-day-num">{formatShortDay(day)}</span>
                  <span className="tl-day-name">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][day.getDay()]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Data rows */}
          {timelineData.length === 0 && (
            <div className="tl-empty">
              Nenhuma tarefa com datas no periodo. Crie empresas e tarefas com prazos para visualizar aqui.
            </div>
          )}

          {timelineData.map((orgData) => (
            <div key={orgData.orgName}>
              {/* Org header */}
              <div className="tl-row tl-org-row">
                <div className="tl-label-cell tl-org-label">
                  <span className="tl-org-tag" style={{ background: orgData.orgColor }}>
                    {orgData.orgName.substring(0, 3).toUpperCase()}
                  </span>
                  {orgData.orgName}
                </div>
                {days.map((_, i) => (
                  <div key={i} className={`tl-cell ${i === todayIndex ? 'tl-today-col' : ''}`} />
                ))}
              </div>

              {orgData.projects.map((proj) => (
                <div key={proj.id}>
                  {/* Project header */}
                  <div className="tl-row tl-project-row">
                    <div
                      className="tl-label-cell tl-project-label"
                      onClick={() => navigate(`/board/${proj.id}`)}
                    >
                      {proj.name}
                    </div>
                    {days.map((_, i) => (
                      <div key={i} className={`tl-cell ${i === todayIndex ? 'tl-today-col' : ''}`} />
                    ))}
                  </div>

                  {/* Task rows */}
                  {proj.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      totalDays={15}
                      todayIndex={todayIndex}
                      days={days}
                    />
                  ))}
                </div>
              ))}

              <div className="tl-separator" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function TaskRow({
  task,
  totalDays,
  todayIndex,
  days,
}: {
  task: TimelineTask;
  totalDays: number;
  todayIndex: number;
  days: Date[];
}) {
  const today = days[todayIndex];
  const isOverdue = task.status !== 'done' && task.endDate < today;

  let barClass = 'tl-bar-pending';
  if (task.status === 'done') barClass = 'tl-bar-done';
  else if (task.status === 'in_progress') barClass = 'tl-bar-progress';
  if (isOverdue) barClass = 'tl-bar-overdue';

  const duration = formatDuration(task.startDate, task.endDate);

  return (
    <div className="tl-row tl-task-row">
      <div className="tl-label-cell tl-task-label" title={task.title}>
        {task.title}
        <span className="tl-duration">{duration}</span>
      </div>
      {days.map((_, i) => {
        const isInBar = i >= task.barStart && i <= task.barEnd;
        const isBarStart = i === task.barStart;
        const isBarEnd = i === task.barEnd;

        return (
          <div key={i} className={`tl-cell ${i === todayIndex ? 'tl-today-col' : ''}`}>
            {isInBar && (
              <div
                className={`tl-bar ${barClass} ${isBarStart ? 'tl-bar-start' : ''} ${isBarEnd ? 'tl-bar-end' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
