import { useState, useEffect } from 'react';
import type { Label } from '../types';
import { labelsApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import LabelBadge from './LabelBadge';

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6', '#6366f1', '#e11d48',
];

interface LabelSelectorProps {
  projectId: string;
  taskId: string;
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
}

export default function LabelSelector({ projectId, taskId, selectedLabels, onLabelsChange }: LabelSelectorProps) {
  const toast = useToastContext();
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    labelsApi.getByProject(projectId)
      .then(res => setProjectLabels(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjectLabels([]));
  }, [projectId]);

  const toggleLabel = async (label: Label) => {
    const isSelected = selectedLabels.some(l => l.id === label.id);
    try {
      if (isSelected) {
        await labelsApi.removeFromTask(taskId, label.id);
        onLabelsChange(selectedLabels.filter(l => l.id !== label.id));
      } else {
        await labelsApi.addToTask(taskId, label.id);
        onLabelsChange([...selectedLabels, label]);
      }
    } catch {
      toast.error('Failed to update labels');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await labelsApi.create({ name: newName.trim(), color: newColor, projectId });
      setProjectLabels(prev => [...prev, res.data]);
      setNewName('');
      setShowCreate(false);
      // Auto-add to task
      await labelsApi.addToTask(taskId, res.data.id);
      onLabelsChange([...selectedLabels, res.data]);
    } catch {
      toast.error('Failed to create label');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="label-selector">
      <div className="label-selected">
        {selectedLabels.map(label => (
          <LabelBadge key={label.id} label={label} onRemove={() => toggleLabel(label)} />
        ))}
      </div>

      <div className="label-dropdown">
        {projectLabels.map(label => {
          const isSelected = selectedLabels.some(l => l.id === label.id);
          return (
            <button
              key={label.id}
              className={`label-option ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleLabel(label)}
            >
              <span className="label-color-dot" style={{ backgroundColor: label.color }} />
              {label.name}
              {isSelected && <span className="label-check">✓</span>}
            </button>
          );
        })}

        {!showCreate ? (
          <button className="label-create-btn" onClick={() => setShowCreate(true)}>
            + Nova label
          </button>
        ) : (
          <div className="label-create-form">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome da label"
              maxLength={50}
            />
            <div className="label-color-grid">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`label-color-swatch ${newColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="label-create-actions">
              <button onClick={handleCreate} className="btn-primary btn-sm" disabled={!newName.trim() || creating}>
                Criar
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
