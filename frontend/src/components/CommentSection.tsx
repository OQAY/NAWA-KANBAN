/**
 * CommentSection Component
 * Displays and manages comments for a task
 */

import { useState, useEffect, useCallback } from 'react';
import type { Comment } from '../types';
import { commentsApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import { getAvatarColor } from '../utils/dates';
import ConfirmDialog from './ConfirmDialog';
import './CommentSection.css';

interface CommentSectionProps {
  taskId: string;
  currentUserId: string;
}

export default function CommentSection({ taskId, currentUserId }: CommentSectionProps) {
  const toast = useToastContext();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({ isOpen: false, commentId: null });

  // Load comments
  useEffect(() => {
    setLoading(true);
    commentsApi.getByTaskId(taskId)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        // Backend returns DESC, reverse for ASC (oldest first)
        setComments([...data].reverse());
      })
      .catch(() => {
        setComments([]);
        toast.error('Failed to load comments');
      })
      .finally(() => setLoading(false));
  }, [taskId, toast]);

  const handleSubmitComment = useCallback(async () => {
    if (!newCommentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await commentsApi.create({ content: newCommentText.trim(), taskId });
      setComments((prev) => [...prev, res.data]);
      setNewCommentText('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [newCommentText, taskId, submitting, toast]);

  const handleEditComment = useCallback(async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;

    try {
      const res = await commentsApi.update(editingCommentId, { content: editingCommentText.trim() });
      setComments((prev) =>
        prev.map((c) => (c.id === editingCommentId ? res.data : c))
      );
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch {
      toast.error('Failed to update comment');
    }
  }, [editingCommentId, editingCommentText, toast]);

  const handleDeleteComment = useCallback(async () => {
    const commentId = deleteConfirm.commentId;
    if (!commentId) return;

    try {
      await commentsApi.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeleteConfirm({ isOpen: false, commentId: null });
    }
  }, [deleteConfirm.commentId, toast]);

  const formatTimestamp = (iso: string) => {
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

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">Comentários</h3>

      {loading ? (
        <p className="comment-loading">Carregando comentários...</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">Sem comentários ainda. Seja o primeiro!</p>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <span
                className="comment-avatar"
                style={{ backgroundColor: getAvatarColor(comment.user?.name || '?') }}
              >
                {(comment.user?.name || '?').charAt(0).toUpperCase()}
              </span>
              <div className="comment-body">
                <div className="comment-meta">
                  <strong>{comment.user?.name || 'Unknown'}</strong>
                  <span className="comment-time">{formatTimestamp(comment.createdAt)}</span>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="comment-edit-form">
                    <textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      rows={2}
                    />
                    <div className="comment-edit-actions">
                      <button onClick={handleEditComment} className="btn-primary btn-sm" disabled={!editingCommentText.trim()}>
                        Salvar
                      </button>
                      <button onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} className="btn-secondary btn-sm">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="comment-text">{comment.content}</p>
                    {comment.userId === currentUserId && (
                      <div className="comment-actions">
                        <button
                          onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }}
                          className="btn-link"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, commentId: comment.id })}
                          className="btn-link btn-link-danger"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="comment-form">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
        />
        <button
          onClick={handleSubmitComment}
          className="btn-primary btn-sm"
          disabled={!newCommentText.trim() || submitting}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Comentário"
        message="Tem certeza que deseja excluir este comentário?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDeleteComment}
        onCancel={() => setDeleteConfirm({ isOpen: false, commentId: null })}
      />
    </div>
  );
}
