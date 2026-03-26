import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { organizationsApi } from '../api/services';
import { sanitizeTextInput } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import ColorPicker from '../components/ColorPicker';
import { ClipboardIcon, PlusIcon, SettingsIcon } from '../components/icons/Icons';
import type { OrganizationOverview } from '../types';
import './OverviewPage.css';

const DEFAULT_COLORS = ['#A78BFA', '#34D399', '#F87171', '#38BDF8', '#FBBF24', '#EC4899'];

function getDefaultColor(index: number) {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
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

export default function OverviewPage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgColor, setNewOrgColor] = useState(DEFAULT_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Settings modal state
  const [settingsOrg, setSettingsOrg] = useState<OrganizationOverview | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const response = await organizationsApi.getMyOverview();
      setOrgs(response.data);
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleCreateOrg = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitizeTextInput(newOrgName);
    if (name.length < 2) return;

    setCreating(true);
    try {
      await organizationsApi.create({ name, description: sanitizeTextInput(newOrgDesc), color: newOrgColor });
      toast.success('Empresa criada com sucesso');
      setShowCreateModal(false);
      setNewOrgName('');
      setNewOrgDesc('');
      setNewOrgColor(DEFAULT_COLORS[(orgs.length + 1) % DEFAULT_COLORS.length]);
      loadOverview();
    } catch (error) {
      toast.error('Erro ao criar empresa');
    } finally {
      setCreating(false);
    }
  }, [newOrgName, newOrgDesc, toast, loadOverview]);

  const openSettings = useCallback((org: OrganizationOverview) => {
    setSettingsOrg(org);
    setEditName(org.name);
    setEditDesc(org.description || '');
    setEditColor(org.color || getDefaultColor(orgs.indexOf(org)));
  }, [orgs]);

  const handleSaveSettings = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsOrg) return;
    const name = sanitizeTextInput(editName);
    if (name.length < 2) return;

    setSaving(true);
    try {
      await organizationsApi.update(settingsOrg.id, {
        name,
        description: sanitizeTextInput(editDesc) || undefined,
        color: editColor,
      });
      setOrgs(prev => prev.map(o =>
        o.id === settingsOrg.id ? { ...o, name, description: editDesc, color: editColor } : o
      ));
      toast.success('Empresa atualizada');
      setSettingsOrg(null);
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }, [settingsOrg, editName, editDesc, editColor, toast]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.classList.add('org-card-dragging');
      }
    });
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };

  const handleDragEnd = async () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove('org-card-dragging');
    }

    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const newOrgs = [...orgs];
      const [moved] = newOrgs.splice(dragIdx, 1);
      newOrgs.splice(overIdx, 0, moved);
      setOrgs(newOrgs);

      // Persist to backend
      try {
        await organizationsApi.reorder(newOrgs.map(o => o.id));
      } catch (error) {
        console.error('Failed to reorder:', error);
        toast.error('Erro ao salvar ordem');
        loadOverview();
      }
    }

    setDragIdx(null);
    setOverIdx(null);
    dragNodeRef.current = null;
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Carregando overview..." />;
  }

  const totalProjects = orgs.reduce((s, o) => s + o.projects.length, 0);
  const totalActiveTasks = orgs.reduce((s, o) => s + o.projects.reduce((s2, p) =>
    s2 + p.tasks.filter(t => t.status !== 'done').length, 0), 0);

  return (
    <div className="overview-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <ClipboardIcon size={28} />
            </div>
            <div className="header-title">
              <h1>Overview - Minhas Empresas</h1>
              <p className="header-subtitle">
                {orgs.length} empresas | {totalProjects} projetos | {totalActiveTasks} tarefas ativas
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-nav"
              onClick={() => navigate('/timeline')}
            >
              Timeline
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

      <main className="overview-content">
        {orgs.length === 0 && (
          <div className="overview-empty">
            <p>Nenhuma empresa ainda. Crie sua primeira empresa para organizar seus projetos.</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Criar Empresa
            </button>
          </div>
        )}

        <div className="overview-orgs">
          {orgs.map((org, orgIdx) => {
            const color = org.color || getDefaultColor(orgIdx);
            const orgActiveTasks = org.projects.reduce((s, p) => s + p.tasks.filter(t => t.status !== 'done').length, 0);
            const isOver = overIdx === orgIdx && dragIdx !== null && dragIdx !== orgIdx;

            return (
              <div
                key={org.id}
                className={`org-card${isOver ? ' org-card-drop-target' : ''}`}
                style={{ borderLeftColor: color }}
                draggable
                onDragStart={(e) => handleDragStart(e, orgIdx)}
                onDragOver={(e) => handleDragOver(e, orgIdx)}
                onDragLeave={() => { if (overIdx === orgIdx) setOverIdx(null); }}
                onDrop={handleDragEnd}
                onDragEnd={handleDragEnd}
              >
                <div className="org-drag-handle" title="Arraste para reordenar">
                  <span>⋮⋮</span>
                </div>
                <div className="org-card-content">
                  <div className="org-header">
                    <span
                      className="org-name"
                      onClick={() => navigate(`/organization/${org.id}`)}
                    >
                      {org.name}
                    </span>
                    <div className="org-header-right">
                      <span className="org-stats">
                        {org.projects.length} projetos | {orgActiveTasks} tarefas
                      </span>
                      <button
                        className="btn-settings"
                        onClick={(e) => { e.stopPropagation(); openSettings(org); }}
                        title="Configurações da empresa"
                      >
                        <SettingsIcon size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="org-projects">
                    {org.projects.map((project) => {
                      const done = project.tasksByStatus['done'] || 0;
                      const inProgress = project.tasksByStatus['in_progress'] || 0;
                      const total = project.totalTasks || 1;
                      const donePercent = (done / total) * 100;
                      const progressPercent = (inProgress / total) * 100;
                      const todoPercent = 100 - donePercent - progressPercent;

                      // Overview mostra apenas tarefas ativas (não concluídas)
                      const activeTasks = project.tasks.filter(t => t.status !== 'done');

                      return (
                        <div
                          key={project.id}
                          className="ov-project-card"
                          onClick={() => navigate(`/board/${project.id}`)}
                        >
                          <div className="ov-project-name">
                            {project.name}
                            <span className="ov-task-count">({activeTasks.length})</span>
                          </div>

                          <ul className="ov-task-list">
                            {activeTasks.slice(0, 8).map((task) => (
                              <li key={task.id}>
                                <span className="ov-task-title">{task.title}</span>
                                <span className={`ov-prazo ${getPrazoClass(task.dueDate)}`}>
                                  {formatDate(task.dueDate)}
                                </span>
                              </li>
                            ))}
                            {activeTasks.length > 8 && (
                              <li className="ov-more">
                                +{activeTasks.length - 8} mais...
                              </li>
                            )}
                          </ul>

                          <div className="ov-status-bar">
                            <div className="done" style={{ width: `${donePercent}%` }} />
                            <div className="progress" style={{ width: `${progressPercent}%` }} />
                            <div className="todo" style={{ width: `${todoPercent}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className="ov-project-add-small"
                      onClick={() => navigate(`/organization/${org.id}`)}
                      title="Criar novo projeto"
                    >
                      <PlusIcon size={16} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="org-card org-card-create"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon size={28} />
            <span>Criar Nova Empresa</span>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Criar Empresa</h2>
            <p className="modal-subtitle">Organize seus projetos por empresa</p>
            <form onSubmit={handleCreateOrg}>
              <div className="form-group">
                <label htmlFor="org-name">Nome da Empresa</label>
                <div className="form-row-color">
                  <ColorPicker value={newOrgColor} onChange={setNewOrgColor} />
                  <input
                    type="text"
                    id="org-name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    required
                    disabled={creating}
                    autoFocus
                    placeholder="Ex: Minha Empresa"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="org-desc">Descricao (opcional)</label>
                <textarea
                  id="org-desc"
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                  disabled={creating}
                  rows={2}
                  placeholder="Descricao breve da empresa"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {settingsOrg && (
        <div className="modal-overlay" onClick={() => setSettingsOrg(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Configurações da Empresa</h2>
            <p className="modal-subtitle">Editar nome, descrição e cor</p>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label htmlFor="edit-name">Nome da Empresa</label>
                <div className="form-row-color">
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <input
                    type="text"
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={saving}
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-desc">Descrição (opcional)</label>
                <textarea
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={saving}
                  rows={2}
                  placeholder="Descrição breve da empresa"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSettingsOrg(null)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
