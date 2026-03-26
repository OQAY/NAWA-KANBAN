import { useState, useEffect } from 'react';
import type { Checklist } from '../types';
import { checklistsApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import './ChecklistSection.css';

interface ChecklistSectionProps {
  taskId: string;
}

export default function ChecklistSection({ taskId }: ChecklistSectionProps) {
  const toast = useToastContext();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    checklistsApi.getByTask(taskId)
      .then(res => setChecklists(Array.isArray(res.data) ? res.data : []))
      .catch(() => setChecklists([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const res = await checklistsApi.create(taskId, newChecklistTitle.trim());
      setChecklists(prev => [...prev, { ...res.data, items: res.data.items || [] }]);
      setNewChecklistTitle('');
    } catch {
      toast.error('Failed to create checklist');
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    try {
      await checklistsApi.delete(id);
      setChecklists(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error('Failed to delete checklist');
    }
  };

  const handleAddItem = async (checklistId: string) => {
    const text = newItemTexts[checklistId]?.trim();
    if (!text) return;
    try {
      const res = await checklistsApi.addItem(checklistId, text);
      setChecklists(prev => prev.map(c =>
        c.id === checklistId ? { ...c, items: [...(c.items || []), res.data] } : c
      ));
      setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }));
    } catch {
      toast.error('Failed to add item');
    }
  };

  const handleToggleItem = async (checklistId: string, itemId: string) => {
    try {
      const res = await checklistsApi.toggleItem(itemId);
      setChecklists(prev => prev.map(c =>
        c.id === checklistId
          ? { ...c, items: c.items.map(i => i.id === itemId ? res.data : i) }
          : c
      ));
    } catch {
      toast.error('Failed to toggle item');
    }
  };

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    try {
      await checklistsApi.deleteItem(itemId);
      setChecklists(prev => prev.map(c =>
        c.id === checklistId
          ? { ...c, items: c.items.filter(i => i.id !== itemId) }
          : c
      ));
    } catch {
      toast.error('Failed to delete item');
    }
  };

  if (loading) return <p className="checklist-loading">Carregando checklists...</p>;

  return (
    <div className="checklist-section">
      <h3 className="checklist-section-title">Checklists</h3>

      {checklists.map(checklist => {
        const total = checklist.items?.length || 0;
        const done = checklist.items?.filter(i => i.completed).length || 0;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div key={checklist.id} className="checklist-block">
            <div className="checklist-header">
              <strong>{checklist.title}</strong>
              <span className="checklist-progress">{done}/{total}</span>
              <button onClick={() => handleDeleteChecklist(checklist.id)} className="btn-link btn-link-danger" title="Delete checklist">
                x
              </button>
            </div>

            <div className="checklist-progress-bar">
              <div
                className={`checklist-progress-fill ${progress === 100 ? 'complete' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="checklist-items">
              {checklist.items?.map(item => (
                <div key={item.id} className={`checklist-item ${item.completed ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleItem(checklist.id, item.id)}
                  />
                  <span className="checklist-item-text">{item.text}</span>
                  <button onClick={() => handleDeleteItem(checklist.id, item.id)} className="checklist-item-delete" title="Delete">
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="checklist-add-item">
              <input
                type="text"
                value={newItemTexts[checklist.id] || ''}
                onChange={e => setNewItemTexts(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                placeholder="Novo item..."
                onKeyDown={e => { if (e.key === 'Enter') handleAddItem(checklist.id); }}
              />
              <button onClick={() => handleAddItem(checklist.id)} className="btn-primary btn-sm" disabled={!newItemTexts[checklist.id]?.trim()}>
                +
              </button>
            </div>
          </div>
        );
      })}

      <div className="checklist-create">
        <input
          type="text"
          value={newChecklistTitle}
          onChange={e => setNewChecklistTitle(e.target.value)}
          placeholder="Nova checklist..."
          onKeyDown={e => { if (e.key === 'Enter') handleCreateChecklist(); }}
        />
        <button onClick={handleCreateChecklist} className="btn-primary btn-sm" disabled={!newChecklistTitle.trim()}>
          Adicionar checklist
        </button>
      </div>
    </div>
  );
}
