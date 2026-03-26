import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useKanbanStore } from '../stores/kanbanStore';
import { useToastContext } from '../contexts/ToastContext';
import { projectsApi } from '../api/services';
import { sanitizeTextInput, isValidBoardName } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardIcon, FolderIcon, PlusIcon } from '../components/icons/Icons';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const user = useAuthStore((state) => state.user) || { name: 'John Doe', email: 'john@example.com', role: 'admin' } as any;
  const logout = useAuthStore((state) => state.logout);
  const { projects, setProjects, addProject } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      // MOCK DATA PARA VISUALIZAÇÃO
      setProjects([
        {
          id: '1',
          name: 'Website Redesign',
          description: 'Modernize company website with new branding',
          ownerId: '1',
          tasks: [
            { id: '1', title: 'Design mockups', status: 'todo' },
            { id: '2', title: 'Develop frontend', status: 'in-progress' },
            { id: '3', title: 'Test on mobile', status: 'done' },
          ] as any,
        },
        {
          id: '2',
          name: 'Mobile App',
          description: 'Build native iOS and Android apps',
          ownerId: '1',
          tasks: [
            { id: '4', title: 'API integration', status: 'in-progress' },
          ] as any,
        },
        {
          id: '3',
          name: 'Marketing Campaign',
          description: 'Q4 2024 marketing initiatives and social media',
          ownerId: '1',
          tasks: [] as any,
        },
      ] as any);
    } finally {
      setLoading(false);
    }
  }, [setProjects, toast]);

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');

    const sanitizedName = sanitizeTextInput(newProjectName);

    if (!isValidBoardName(sanitizedName)) {
      setNameError('Board name must be between 3 and 100 characters');
      return;
    }

    setCreating(true);

    try {
      const response = await projectsApi.create({
        name: sanitizedName,
        description: sanitizeTextInput(newProjectDesc),
      });
      addProject(response.data);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      toast.success('Board created successfully');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create board');
    } finally {
      setCreating(false);
    }
  }, [newProjectName, newProjectDesc, addProject, toast]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading boards..." />;
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <ClipboardIcon size={28} />
            </div>
            <div className="header-title">
              <h1>My Boards</h1>
              <p className="header-subtitle">Manage your projects and tasks</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-nav"
              onClick={() => navigate('/overview')}
            >
              Overview
            </button>
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

      {/* Content */}
      <main className="dashboard-content">
        <div className="projects-grid">
          {/* Create new board card */}
          <div
            className="project-card project-card-create"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="create-icon">
              <PlusIcon size={32} />
            </div>
            <h3>Create New Board</h3>
          </div>

          {/* Project cards */}
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/board/${project.id}`)}
            >
              <div className="project-card-header">
                <div className="project-icon">
                  <FolderIcon size={24} />
                </div>
                <h3>{project.name}</h3>
              </div>
              {project.description && <p>{project.description}</p>}
              <div className="project-meta">
                <span>{project.tasks?.length || 0} tasks</span>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="empty-state">
            <p>No boards yet. Create your first board to get started!</p>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Board</h2>
            <p className="modal-subtitle">Start organizing your tasks with a new board</p>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="project-name">Board Name</label>
                <input
                  type="text"
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setNameError('');
                  }}
                  required
                  disabled={creating}
                  autoFocus
                  aria-describedby={nameError ? 'name-error' : undefined}
                  aria-invalid={!!nameError}
                />
                {nameError && (
                  <span id="name-error" className="error-message" role="alert">
                    {nameError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="project-desc">Description (optional)</label>
                <textarea
                  id="project-desc"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  disabled={creating}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
