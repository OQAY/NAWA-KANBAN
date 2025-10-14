import { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectMember } from '../types';
import { projectsApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import { isValidEmail } from '../utils/validation';
import ConfirmDialog from './ConfirmDialog';
import './ShareBoardModal.css';

interface ShareBoardModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}

export default function ShareBoardModal({ isOpen, project, onClose }: ShareBoardModalProps) {
  const toast = useToastContext();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  // Add member form
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [emailError, setEmailError] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; member: ProjectMember | null }>({
    isOpen: false,
    member: null,
  });

  useEffect(() => {
    if (isOpen && project) {
      loadMembers();
    }
  }, [isOpen, project]);

  const loadMembers = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    try {
      const response = await projectsApi.getMembers(project.id);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [project, toast]);

  const handleAddMember = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!project) return;

    setAddingMember(true);
    try {
      const response = await projectsApi.addMember(project.id, { email, role });
      setMembers((prev) => [response.data, ...prev]);
      setEmail('');
      setRole('viewer');
      toast.success(`Member added successfully`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to add member';
      setEmailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAddingMember(false);
    }
  }, [email, role, project, toast]);

  const handleUpdateRole = useCallback(async (member: ProjectMember, newRole: string) => {
    if (!project) return;

    try {
      const response = await projectsApi.updateMember(project.id, member.id, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? response.data : m))
      );
      toast.success('Member role updated');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update member role');
    }
  }, [project, toast]);

  const handleRemoveMember = useCallback((member: ProjectMember) => {
    setDeleteConfirm({ isOpen: true, member });
  }, []);

  const confirmRemove = useCallback(async () => {
    const member = deleteConfirm.member;
    if (!member || !project) return;

    try {
      await projectsApi.removeMember(project.id, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Member removed from board');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    } finally {
      setDeleteConfirm({ isOpen: false, member: null });
    }
  }, [deleteConfirm.member, project, toast]);

  if (!isOpen || !project) return null;

  const isOwner = project.owner?.id === project.ownerId;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Share Board</h2>
            <button className="btn-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="share-modal-body">
            {/* Add Member Form */}
            {isOwner && (
              <form onSubmit={handleAddMember} className="add-member-form">
                <h3>Add Member</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="member-email">Email</label>
                    <input
                      type="email"
                      id="member-email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="user@example.com"
                      required
                      disabled={addingMember}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      aria-invalid={!!emailError}
                    />
                    {emailError && (
                      <span id="email-error" className="error-message" role="alert">
                        {emailError}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="member-role">Role</label>
                    <select
                      id="member-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={addingMember}
                    >
                      <option value="viewer">Viewer (View only)</option>
                      <option value="editor">Editor (Can edit)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-primary btn-add" disabled={addingMember}>
                    {addingMember ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            )}

            {/* Members List */}
            <div className="members-section">
              <h3>Members ({members.length})</h3>

              {loading ? (
                <div className="members-loading">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="members-empty">
                  No members yet. Add members to share this board.
                </div>
              ) : (
                <div className="members-list">
                  {members.map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="member-details">
                          <div className="member-name">{member.user.name}</div>
                          <div className="member-email">{member.user.email}</div>
                        </div>
                      </div>

                      <div className="member-actions">
                        {isOwner ? (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member, e.target.value)}
                              className="member-role-select"
                              aria-label={`Change role for ${member.user.name}`}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className="btn-icon btn-remove"
                              aria-label={`Remove ${member.user.name}`}
                              title="Remove member"
                            >
                              🗑️
                            </button>
                          </>
                        ) : (
                          <span className="member-role-badge">{member.role}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Owner Info */}
            {project.owner && (
              <div className="owner-section">
                <h3>Owner</h3>
                <div className="member-item owner-item">
                  <div className="member-info">
                    <div className="member-avatar owner-avatar">
                      {project.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-details">
                      <div className="member-name">{project.owner.name}</div>
                      <div className="member-email">{project.owner.email}</div>
                    </div>
                  </div>
                  <span className="member-role-badge owner-badge">Owner</span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Remove Member"
        message={`Are you sure you want to remove ${deleteConfirm.member?.user.name} from this board?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setDeleteConfirm({ isOpen: false, member: null })}
      />
    </>
  );
}
