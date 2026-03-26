import { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';

const PRESET_COLORS = [
  '#A78BFA', '#8B5CF6', '#7C3AED',
  '#34D399', '#10B981', '#059669',
  '#F87171', '#EF4444', '#DC2626',
  '#38BDF8', '#0EA5E9', '#0284C7',
  '#FBBF24', '#F59E0B', '#D97706',
  '#EC4899', '#DB2777', '#BE185D',
  '#6366F1', '#A3E635', '#FB923C',
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

export default function ColorPicker({ value, onChange, size = 'md' }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = value || PRESET_COLORS[0];

  return (
    <div className={`color-picker ${size}`} ref={ref}>
      <button
        type="button"
        className="color-picker-trigger"
        style={{ backgroundColor: current }}
        onClick={() => setOpen(!open)}
        title="Escolher cor"
      />
      {open && (
        <div className="color-picker-dropdown">
          <div className="color-picker-grid">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch${c === current ? ' active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
