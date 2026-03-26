import { useState, useMemo } from 'react';
import type { Task, KanbanColumn, ProjectMember } from '../types';
import { getPriorityColor, getPriorityLabel } from '../utils';
import { formatDueDate, isDueDateOverdue, getAvatarColor } from '../utils/dates';
import './TableView.css';

interface TableViewProps {
  tasks: Task[];
  columns: KanbanColumn[];
  projectMembers: ProjectMember[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
}

type SortKey = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee';
type SortDir = 'asc' | 'desc';

export default function TableView({ tasks, columns, onTaskClick }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'priority': cmp = (a.priority || 0) - (b.priority || 0); break;
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case 'assignee': {
          const na = a.assignee?.name || '';
          const nb = b.assignee?.name || '';
          cmp = na.localeCompare(nb);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortKey, sortDir]);

  const getColumnName = (status: string) =>
    columns.find(c => c.status === status)?.name || status;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="table-view">
      <table className="table-view-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('status')} className="sortable">
              Status{sortIndicator('status')}
            </th>
            <th onClick={() => handleSort('title')} className="sortable">
              Título{sortIndicator('title')}
            </th>
            <th onClick={() => handleSort('assignee')} className="sortable">
              Responsável{sortIndicator('assignee')}
            </th>
            <th>Labels</th>
            <th onClick={() => handleSort('dueDate')} className="sortable">
              Due Date{sortIndicator('dueDate')}
            </th>
            <th onClick={() => handleSort('priority')} className="sortable">
              Prioridade{sortIndicator('priority')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map(task => (
            <tr key={task.id} className="table-row" onClick={() => onTaskClick(task)}>
              <td>
                <span className="table-status-badge">
                  {getColumnName(task.status)}
                </span>
              </td>
              <td className="table-title-cell">{task.title}</td>
              <td>
                {task.assignee ? (
                  <span className="table-assignee">
                    <span className="task-assignee-avatar" style={{ backgroundColor: getAvatarColor(task.assignee.name) }}>
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </span>
                    {task.assignee.name}
                  </span>
                ) : (
                  <span className="table-empty">—</span>
                )}
              </td>
              <td>
                <div className="table-labels">
                  {task.labels?.slice(0, 2).map(l => (
                    <span key={l.id} className="label-badge" style={{ backgroundColor: l.color + '22', color: l.color, borderColor: l.color }}>
                      {l.name}
                    </span>
                  ))}
                  {(task.labels?.length ?? 0) > 2 && <span className="label-badge label-more">+{(task.labels?.length ?? 0) - 2}</span>}
                </div>
              </td>
              <td>
                {task.dueDate ? (
                  <span className={`task-due-date ${isDueDateOverdue(task.dueDate) ? 'overdue' : ''}`}>
                    {formatDueDate(task.dueDate)}
                  </span>
                ) : (
                  <span className="table-empty">—</span>
                )}
              </td>
              <td>
                <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                  {getPriorityLabel(task.priority)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedTasks.length === 0 && (
        <p className="table-empty-state">Nenhuma tarefa encontrada</p>
      )}
    </div>
  );
}
