import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { authApi } from '../api/services';
import { isValidEmail, getPasswordStrength, sanitizeTextInput } from '../utils/validation';
import { ClipboardIcon, LayoutIcon, UsersIcon, LockIcon, AlertCircleIcon } from '../components/icons/Icons';
import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  const navigate = useNavigate();
  const toast = useToastContext();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (!isLogin && value.length > 0) {
      const { strength } = getPasswordStrength(value);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [isLogin]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isLogin) {
      const sanitizedName = sanitizeTextInput(name);
      if (sanitizedName.length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }

      const { strength, message } = getPasswordStrength(password);
      if (strength === 'weak') {
        setError(message);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await authApi.login({ email, password });
        setAuth(response.data.user, response.data.access_token, response.data.refresh_token);
        toast.success('Welcome back!');
        navigate('/overview');
      } else {
        const response = await authApi.register({
          email,
          password,
          name: sanitizeTextInput(name),
        });
        setAuth(response.data.user, response.data.access_token, response.data.refresh_token);
        toast.success('Account created successfully!');
        navigate('/overview');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, name, setAuth, navigate, toast]);

  return (
    <div className="login-container">
      {/* Hero Section - Left Side */}
      <div className="login-hero">
        <div className="login-hero-content">
          <div className="logo-section">
            <div className="logo-icon">
              <ClipboardIcon size={32} />
            </div>
            <h2 className="logo-text">IA-KANBA</h2>
          </div>

          <h1 className="hero-title">
            Organize seu trabalho,<br />
            <span className="hero-highlight">com IA</span>
          </h1>

          <p className="hero-description">
            Gerencie seus projetos com um Kanban inteligente e intuitivo.
            Colabore com sua equipe e entregue resultados.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">
                <LayoutIcon size={20} />
              </span>
              <span>Drag & Drop Tasks</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">
                <UsersIcon size={20} />
              </span>
              <span>Team Collaboration</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">
                <LockIcon size={20} />
              </span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section - Right Side */}
      <div className="login-form-section">
        <div className="login-card">
          <div className="card-header">
            <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p className="card-subtitle">
              {isLogin ? 'Sign in to continue to your dashboard' : 'Start managing your projects today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
                className="form-input"
                aria-describedby={!isLogin && passwordStrength ? 'password-strength' : undefined}
              />
              {!isLogin && passwordStrength && (
                <div
                  id="password-strength"
                  className={`password-strength password-strength-${passwordStrength}`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="strength-bar">
                    <div className={`strength-fill strength-fill-${passwordStrength}`}></div>
                  </div>
                  <span className="strength-text">Password strength: {passwordStrength}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message" role="alert">
                <span className="error-icon">
                  <AlertCircleIcon size={20} />
                </span>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="button-loader"></span>
                  Loading...
                </>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </button>
          </form>

          <div className="card-footer">
            <p className="toggle-text">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPasswordStrength(null);
              }}
              className="btn-toggle"
              disabled={loading}
            >
              {isLogin ? 'Sign up for free' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
