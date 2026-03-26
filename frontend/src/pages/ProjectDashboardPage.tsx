import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/services';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProjectDashboardPage.css';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  testing: '#8b5cf6',
  done: '#10b981',
};

const PRIORITY_COLORS = ['#6b7280', '#10b981', '#f59e0b', '#ef4444'];
const PRIORITY_NAMES = ['Nenhuma', 'Baixa', 'Média', 'Alta'];

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    byStatus: { status: string; count: string }[];
    byPriority: { priority: string; count: string }[];
    byAssignee: { name: string; count: string }[];
    byWeek: { week: string; count: string }[];
    summary: { totalOpen: number; totalOverdue: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    analyticsApi.getProjectAnalytics(projectId)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  if (!data) return <p>Erro ao carregar dashboard</p>;

  const statusData = data.byStatus.map(s => ({
    name: s.status,
    value: parseInt(s.count),
  }));

  const priorityData = data.byPriority.map(p => ({
    name: PRIORITY_NAMES[parseInt(p.priority)] || p.priority,
    value: parseInt(p.count),
    fill: PRIORITY_COLORS[parseInt(p.priority)] || '#6b7280',
  }));

  const assigneeData = data.byAssignee.map(a => ({
    name: a.name || 'Sem nome',
    tasks: parseInt(a.count),
  }));

  const weekData = data.byWeek.map(w => ({
    week: new Date(w.week).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
    concluidas: parseInt(w.count),
  }));

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button onClick={() => navigate(-1)} className="btn-back">← Voltar</button>
        <h1>Dashboard</h1>
      </header>

      <div className="dashboard-summary">
        <div className="summary-card">
          <span className="summary-number">{data.summary.totalOpen}</span>
          <span className="summary-label">Total</span>
        </div>
        <div className="summary-card overdue">
          <span className="summary-number">{data.summary.totalOverdue}</span>
          <span className="summary-label">Atrasadas</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Status distribution */}
        <div className="dashboard-card">
          <h3>Por Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority distribution */}
        <div className="dashboard-card">
          <h3>Por Prioridade</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" name="Tasks">
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by assignee */}
        {assigneeData.length > 0 && (
          <div className="dashboard-card">
            <h3>Por Responsável</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assigneeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Completed per week */}
        {weekData.length > 0 && (
          <div className="dashboard-card">
            <h3>Concluídas por Semana</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="concluidas" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
