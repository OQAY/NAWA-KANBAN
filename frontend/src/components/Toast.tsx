import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, InfoIcon } from './icons/Icons';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({ id, message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const renderIcon = () => {
    const iconProps = { size: 20 };
    switch (type) {
      case 'success':
        return <CheckCircleIcon {...iconProps} />;
      case 'error':
        return <XCircleIcon {...iconProps} />;
      case 'warning':
        return <AlertCircleIcon {...iconProps} />;
      case 'info':
        return <InfoIcon {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="toast-icon">{renderIcon()}</div>
      <div className="toast-message">{message}</div>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
