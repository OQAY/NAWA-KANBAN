import { useState, useMemo } from 'react';
import type { Task } from '../types';
import { getPriorityColor } from '../utils';
import './CalendarView.css';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const days: { date: number; isCurrentMonth: boolean; tasks: Task[] }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: prevMonthLast - i, isCurrentMonth: false, tasks: [] });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTasks = tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.getFullYear() === year && due.getMonth() === month && due.getDate() === d;
      });
      days.push({ date: d, isCurrentMonth: true, tasks: dayTasks });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, isCurrentMonth: false, tasks: [] });
    }

    return days;
  }, [tasks, year, month]);

  const tasksWithoutDate = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div className="calendar-view">
      <div className="calendar-nav">
        <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="btn-nav">
          ←
        </button>
        <h3>{monthNames[month]} {year}</h3>
        <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="btn-nav">
          →
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="btn-today"
        >
          Hoje
        </button>
      </div>

      <div className="calendar-header-row">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="calendar-day-name">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarData.map((day, i) => (
          <div
            key={i}
            className={`calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isCurrentMonth && isToday(day.date) ? 'today' : ''}`}
          >
            <span className="calendar-date">{day.date}</span>
            <div className="calendar-tasks">
              {day.tasks.slice(0, 3).map(task => (
                <button
                  key={task.id}
                  className="calendar-task-item"
                  onClick={() => onTaskClick(task)}
                  style={{ borderLeftColor: getPriorityColor(task.priority) }}
                  title={task.title}
                >
                  {task.title}
                </button>
              ))}
              {day.tasks.length > 3 && (
                <span className="calendar-more">+{day.tasks.length - 3} mais</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {tasksWithoutDate.length > 0 && (
        <div className="calendar-no-date">
          <strong>Sem data ({tasksWithoutDate.length})</strong>
          <div className="calendar-no-date-list">
            {tasksWithoutDate.map(task => (
              <button key={task.id} className="calendar-task-item" onClick={() => onTaskClick(task)}>
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
