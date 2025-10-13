import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { authApi } from '../api/services';
import { isValidEmail, getPasswordStrength, sanitizeTextInput } from '../utils/validation';
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
        // Login
        const response = await authApi.login({ email, password });
        setAuth(response.data.user, response.data.access_token);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        // Register
        const response = await authApi.register({
          email,
          password,
          name: sanitizeTextInput(name),
        });
        setAuth(response.data.user, response.data.access_token);
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, name, setAuth, navigate, toast]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        <p className="login-subtitle">
          {isLogin ? 'Welcome back!' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              aria-describedby={!isLogin && passwordStrength ? 'password-strength' : undefined}
            />
            {!isLogin && passwordStrength && (
              <div
                id="password-strength"
                className={`password-strength password-strength-${passwordStrength}`}
                role="status"
                aria-live="polite"
              >
                Password strength: {passwordStrength}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="toggle-mode">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="btn-link"
            disabled={loading}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
