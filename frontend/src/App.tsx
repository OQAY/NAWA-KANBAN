import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { setUnauthorizedHandler } from './api/axios';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
// DashboardPage removida - overview é a página principal
import KanbanPage from './pages/KanbanPage';
import OverviewPage from './pages/OverviewPage';
import OrganizationDetailPage from './pages/OrganizationDetailPage';
import TimelinePage from './pages/TimelinePage';
import ProfilePage from './pages/ProfilePage';
import AIChatPanel from './components/ai-chat/AIChatPanel';
import './App.css';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Global AI Chat — available on all authenticated pages
function GlobalAIChat() {
  const [showAIChat, setShowAIChat] = useState(false);
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Extract projectId from URL if on board page
  const projectIdMatch = location.pathname.match(/\/board\/([^/]+)/);
  const projectId = projectIdMatch?.[1];

  if (!isAuthenticated) return null;

  return (
    <>
      <AIChatPanel
        projectId={projectId}
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
      {!showAIChat && (
        <button
          className="btn-ai-chat-toggle"
          onClick={() => setShowAIChat(true)}
          title="Abrir assistente AI"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </>
  );
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const logout = useAuthStore((state) => state.logout);

  // Load auth state from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Setup unauthorized handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });
  }, [logout, navigate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      {/* /dashboard redireciona para /overview */}
      <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <OverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <TimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/:orgId"
        element={
          <ProtectedRoute>
            <OrganizationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:projectId"
        element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
          <GlobalAIChat />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
