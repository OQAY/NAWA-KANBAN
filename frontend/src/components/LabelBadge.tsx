import type { Label } from '../types';

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
}

export default function LabelBadge({ label, onRemove }: LabelBadgeProps) {
  return (
    <span
      className="label-badge"
      style={{ backgroundColor: label.color + '22', color: label.color, borderColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button onClick={onRemove} className="label-badge-remove" title="Remove label">
          x
        </button>
      )}
    </span>
  );
}
