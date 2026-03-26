import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import { organizationsApi, projectsApi } from '../api/services';
import { sanitizeTextInput } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import ColorPicker from '../components/ColorPicker';
import { SettingsIcon } from '../components/icons/Icons';
import type { OrganizationOverview, OrganizationOverviewProject, OrganizationOverviewTask } from '../types';
import './OrganizationDetailPage.css';

const PRIORITY_COLORS = ['#d1d5db', '#16a34a', '#eab308', '#dc2626'];

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getPrazoClass(dateStr?: string) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  if (due < today) return 'atrasado';
  if (due.getTime() === today.getTime()) return 'hoje';
  return '';
}

function groupTasksByStatus(tasks: OrganizationOverviewTask[]) {
  const groups: Record<string, OrganizationOverviewTask[]> = {
    done: [],
    in_progress: [],
    pending: [],
  };
  for (const t of tasks) {
    const status = t.status || 'pending';
    if (!groups[status]) groups[status] = [];
    groups[status].push(t);
  }
  return groups;
}

const STATUS_LABELS: Record<string, string> = {
  done: 'Concluido',
  in_progress: 'Em Progresso',
  pending: 'Pendente',
  testing: 'Em Teste',
};

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrganizationOverview | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#A78BFA');
  const [creating, setCreating] = useState(false);

  // Project settings modal
  const [settingsProject, setSettingsProject] = useState<OrganizationOverviewProject | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjColor, setEditProjColor] = useState('');
  const [savingProj, setSavingProj] = useState(false);

  const loadOrg = useCallback(async () => {
    if (!orgId) return;
    try {
      const response = await organizationsApi.getOverview(orgId);
      setOrg(response.data);
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast.error('Erro ao carregar empresa');
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitizeTextInput(newProjectName);
    if (name.length < 3) return;

    setCreating(true);
    try {
      await projectsApi.create({
        name,
        description: sanitizeTextInput(newProjectDesc),
        color: newProjectColor,
        organizationId: orgId,
      } as any);
      toast.success('Projeto criado com sucesso');
      setShowCreateProject(false);
      setNewProjectName('');
      setNewProjectDesc('');
      loadOrg();
    } catch (error) {
      toast.error('Erro ao criar projeto');
    } finally {
      setCreating(false);
    }
  }, [newProjectName, newProjectDesc, orgId, toast, loadOrg]);

  const openProjectSettings = useCallback((project: OrganizationOverviewProject) => {
    setSettingsProject(project);
    setEditProjName(project.name);
    setEditProjColor(project.color || '#A78BFA');
  }, []);

  const handleSaveProjectSettings = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsProject) return;
    const name = sanitizeTextInput(editProjName);
    if (name.length < 2) return;

    setSavingProj(true);
    try {
      await projectsApi.update(settingsProject.id, {
        name,
        color: editProjColor,
      });
      toast.success('Projeto atualizado');
      setSettingsProject(null);
      loadOrg();
    } catch {
      toast.error('Erro ao salvar configurações do projeto');
    } finally {
      setSavingProj(false);
    }
  }, [settingsProject, editProjName, editProjColor, toast, loadOrg]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Carregando empresa..." />;
  }

  if (!org) {
    return (
      <div className="org-detail-container">
        <div className="org-detail-empty">
          <p>Empresa nao encontrada</p>
          <button className="btn-primary" onClick={() => navigate('/overview')}>
            Voltar ao Overview
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = org.projects.reduce((s, p) => s + p.totalTasks, 0);
  const totalDone = org.projects.reduce((s, p) => s + (p.tasksByStatus['done'] || 0), 0);
  const totalInProgress = org.projects.reduce((s, p) => s + (p.tasksByStatus['in_progress'] || 0), 0);

  // Count overdue and today
  let totalAtrasado = 0;
  let totalHoje = 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const p of org.projects) {
    for (const t of p.tasks) {
      if (t.dueDate && t.status !== 'done') {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < now) totalAtrasado++;
        else if (due.getTime() === now.getTime()) totalHoje++;
      }
    }
  }

  return (
    <div className="org-detail-container">
      {/* Breadcrumb */}
      <div className="od-breadcrumb">
        <span className="od-breadcrumb-link" onClick={() => navigate('/overview')}>
          Overview
        </span>
        <span className="od-breadcrumb-sep">&gt;</span>
        <span>{org.name}</span>
      </div>

      {/* Header */}
      <div className="od-header">
        <div className="od-header-info">
          <h1>{org.name}</h1>
          {org.description && <p>{org.description}</p>}
        </div>
        <div className="od-header-stats">
          <div className="od-stat">
            <div className="od-stat-num">{totalTasks}</div>
            <div className="od-stat-label">Total</div>
          </div>
          <div className="od-stat">
            <div className="od-stat-num">{totalDone}</div>
            <div className="od-stat-label">Concluidas</div>
          </div>
          <div className="od-stat">
            <div className="od-stat-num">{totalInProgress}</div>
            <div className="od-stat-label">Em progresso</div>
          </div>
          {totalAtrasado > 0 && (
            <div className="od-stat">
              <div className="od-stat-num od-stat-danger">{totalAtrasado}</div>
              <div className="od-stat-label">Atrasadas</div>
            </div>
          )}
          {totalHoje > 0 && (
            <div className="od-stat">
              <div className="od-stat-num od-stat-warning">{totalHoje}</div>
              <div className="od-stat-label">Vencem hoje</div>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="od-projects">
        {org.projects.map((project) => (
          <ProjectSection
            key={project.id}
            project={project}
            onOpenBoard={() => navigate(`/board/${project.id}`)}
            onOpenSettings={() => openProjectSettings(project)}
          />
        ))}

        {/* Add project */}
        <div className="od-project od-project-add" onClick={() => setShowCreateProject(true)}>
          <span>+ Criar Novo Projeto</span>
        </div>
      </div>

      {/* Create project modal */}
      {showCreateProject && (
        <div className="modal-overlay" onClick={() => setShowCreateProject(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Novo Projeto</h2>
            <p className="modal-subtitle">Criar projeto em {org.name}</p>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="proj-name">Nome do Projeto</label>
                <div className="form-row-color">
                  <ColorPicker value={newProjectColor} onChange={setNewProjectColor} />
                  <input
                    type="text"
                    id="proj-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    disabled={creating}
                    autoFocus
                    placeholder="Ex: RecorraJa"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="proj-desc">Descricao (opcional)</label>
                <textarea
                  id="proj-desc"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  disabled={creating}
                  rows={2}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {settingsProject && (
        <div className="modal-overlay" onClick={() => setSettingsProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Configurações do Projeto</h2>
            <p className="modal-subtitle">Editar nome e cor</p>
            <form onSubmit={handleSaveProjectSettings}>
              <div className="form-group">
                <label htmlFor="edit-proj-name">Nome do Projeto</label>
                <div className="form-row-color">
                  <ColorPicker value={editProjColor} onChange={setEditProjColor} />
                  <input
                    type="text"
                    id="edit-proj-name"
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    required
                    disabled={savingProj}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSettingsProject(null)}
                  className="btn-secondary"
                  disabled={savingProj}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingProj}>
                  {savingProj ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectSection({
  project,
  onOpenBoard,
  onOpenSettings,
}: {
  project: OrganizationOverviewProject;
  onOpenBoard: () => void;
  onOpenSettings: () => void;
}) {
  const groups = groupTasksByStatus(project.tasks);
  const total = project.totalTasks || 1;
  const done = project.tasksByStatus['done'] || 0;
  const inProgress = project.tasksByStatus['in_progress'] || 0;
  const donePercent = Math.round((done / total) * 100);
  const progressPercent = Math.round((inProgress / total) * 100);

  // Column order for mini-kanban
  const columnOrder = ['done', 'in_progress', 'testing', 'pending'];
  const activeColumns = columnOrder.filter(s => groups[s] && groups[s].length > 0);
  // Also add any custom statuses
  const allStatuses = Object.keys(groups);
  for (const s of allStatuses) {
    if (!activeColumns.includes(s) && groups[s].length > 0) {
      activeColumns.push(s);
    }
  }

  const projectColor = project.color || '#A78BFA';

  return (
    <div className="od-project" style={{ borderLeftColor: projectColor }}>
      <div className="od-project-header">
        <div>
          <span className="od-project-name">{project.name}</span>
          <span className="od-project-meta">
            {' '}- {project.totalTasks} tarefas | {done} concluidas, {inProgress} em progresso
          </span>
        </div>
        <div className="od-project-actions">
          <button className="btn-settings" onClick={onOpenSettings} title="Configurações do projeto">
            <SettingsIcon size={15} />
          </button>
          <button className="od-open-board" onClick={onOpenBoard}>
            Abrir Board
          </button>
        </div>
      </div>

      <div className="od-progress-row">
        <div className="od-progress-bar">
          <div className="done" style={{ width: `${donePercent}%` }} />
          <div className="progress" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="od-progress-text">{donePercent}% concluido</span>
      </div>

      <div className="od-kanban-preview">
        {activeColumns.map((status) => (
          <div key={status} className="od-kanban-col">
            <div className="od-kanban-col-header">
              <span>{STATUS_LABELS[status] || status}</span>
              <span className="od-kanban-count">{groups[status].length}</span>
            </div>
            {groups[status].map((task) => (
              <div key={task.id} className="od-mini-task">
                <div className="od-mini-task-title">
                  <span
                    className="od-priority-dot"
                    style={{ background: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[0] }}
                  />
                  {task.title}
                </div>
                {task.dueDate && (
                  <div className="od-mini-task-meta">
                    <span className={`od-mini-prazo ${getPrazoClass(task.dueDate)}`}>
                      Prazo: {formatDate(task.dueDate)}
                    </span>
                  </div>
                )}
                {!task.dueDate && task.completedAt && (
                  <div className="od-mini-task-meta">
                    <span>Concluido {formatDate(task.completedAt)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {activeColumns.length === 0 && (
          <div className="od-kanban-empty">
            Nenhuma tarefa ainda. Clique em "Abrir Board" para adicionar.
          </div>
        )}
      </div>
    </div>
  );
}
