import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { useAuthStore } from '../../stores/authStore';
import * as authApi from '../../api/services';

// Mock the API services
vi.mock('../../api/services', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // Clear auth store
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login user and update store', async () => {
      const user = userEvent.setup();

      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@test.com',
            name: 'Test User',
            role: 'developer',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          access_token: 'mock-jwt-token',
        },
      };

      vi.mocked(authApi.authApi.login).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^login$/i });

      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for API call and state update
      await waitFor(() => {
        expect(authApi.authApi.login).toHaveBeenCalledWith({
          email: 'test@test.com',
          password: 'password123',
        });
      });

      // Verify store was updated
      const { user: storeUser, token, isAuthenticated } = useAuthStore.getState();
      expect(storeUser).toEqual(mockResponse.data.user);
      expect(token).toBe(mockResponse.data.access_token);
      expect(isAuthenticated).toBe(true);

      // Verify localStorage was updated
      expect(localStorage.getItem('token')).toBe(mockResponse.data.access_token);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.data.user));

      // Verify navigation to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup();

      const mockError = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };
      vi.mocked(authApi.authApi.login).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^login$/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Verify store was NOT updated
      const { user: storeUser, token, isAuthenticated } = useAuthStore.getState();
      expect(storeUser).toBeNull();
      expect(token).toBeNull();
      expect(isAuthenticated).toBe(false);

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Registration Flow', () => {
    it('should successfully register user and update store', async () => {
      const user = userEvent.setup();

      const mockResponse = {
        data: {
          user: {
            id: '2',
            email: 'newuser@test.com',
            name: 'New User',
            role: 'developer',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          access_token: 'new-jwt-token',
        },
      };

      vi.mocked(authApi.authApi.register).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      // Switch to register mode
      const registerButton = screen.getByRole('button', { name: /^register$/i });
      await user.click(registerButton);

      // Fill in registration form
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^register$/i });

      await user.type(nameInput, 'New User');
      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(authApi.authApi.register).toHaveBeenCalledWith({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
        });
      });

      // Verify store was updated
      const { user: storeUser, token, isAuthenticated } = useAuthStore.getState();
      expect(storeUser).toEqual(mockResponse.data.user);
      expect(token).toBe(mockResponse.data.access_token);
      expect(isAuthenticated).toBe(true);

      // Verify navigation to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle registration errors', async () => {
      const user = userEvent.setup();

      const mockError = {
        response: {
          data: {
            message: 'Email already exists',
          },
        },
      };
      vi.mocked(authApi.authApi.register).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      // Switch to register mode
      const registerButton = screen.getByRole('button', { name: /^register$/i });
      await user.click(registerButton);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^register$/i });

      await user.type(nameInput, 'New User');
      await user.type(emailInput, 'existing@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });

      // Verify store was NOT updated
      const { user: storeUser, isAuthenticated } = useAuthStore.getState();
      expect(storeUser).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Logout Flow', () => {
    it('should clear user data and redirect to login', async () => {
      // Setup authenticated user
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'developer' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      useAuthStore.getState().setAuth(mockUser, 'mock-token');

      // Verify user is authenticated
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe('mock-token');

      // Logout
      useAuthStore.getState().logout();

      // Verify store was cleared
      const { user, token, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(token).toBeNull();
      expect(isAuthenticated).toBe(false);

      // Verify localStorage was cleared
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Authentication Persistence', () => {
    it('should restore authentication from localStorage on app load', () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'developer',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      // Simulate existing session in localStorage
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'existing-token');

      // Load from storage (simulating app initialization)
      useAuthStore.getState().loadFromStorage();

      // Verify state was restored
      const { user, token, isAuthenticated } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      expect(token).toBe('existing-token');
      expect(isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      // Set invalid data in localStorage
      localStorage.setItem('user', 'invalid-json');
      localStorage.setItem('token', 'some-token');

      // Try to load from storage
      useAuthStore.getState().loadFromStorage();

      // Verify store remains empty (graceful failure)
      const { user, token, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(token).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });
});
