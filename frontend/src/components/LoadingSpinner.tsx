import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  fullScreen = false,
  message,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="loading-overlay" role="alert" aria-busy="true" aria-live="polite">
        <div className="loading-content">
          <div className={`spinner spinner-${size}`} aria-hidden="true">
            <div className="spinner-circle"></div>
            <div className="spinner-circle"></div>
            <div className="spinner-circle"></div>
            <div className="spinner-circle"></div>
          </div>
          {message && <p className="loading-message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline" role="status" aria-label={message || 'Loading'}>
      <div className={`spinner spinner-${size}`} aria-hidden="true">
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      {message && <span className="loading-message">{message}</span>}
    </div>
  );
}
