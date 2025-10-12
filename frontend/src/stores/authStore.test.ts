import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User, UserRole } from '../types';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    localStorage.clear();
  });

  it('should initialize with empty state', () => {
    const { user, token, isAuthenticated } = useAuthStore.getState();

    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should set auth correctly', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'developer' as UserRole,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const mockToken = 'mock-jwt-token';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    const { user, token, isAuthenticated } = useAuthStore.getState();

    expect(user).toEqual(mockUser);
    expect(token).toBe(mockToken);
    expect(isAuthenticated).toBe(true);
  });

  it('should persist auth to localStorage', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'developer' as UserRole,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const mockToken = 'mock-jwt-token';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    expect(localStorage.getItem('token')).toBe(mockToken);
  });

  it('should logout correctly', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'developer' as UserRole,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const mockToken = 'mock-jwt-token';

    // Set auth first
    useAuthStore.getState().setAuth(mockUser, mockToken);

    // Then logout
    useAuthStore.getState().logout();

    const { user, token, isAuthenticated } = useAuthStore.getState();

    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should load auth from localStorage', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'developer' as UserRole,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const mockToken = 'mock-jwt-token';

    // Set directly in localStorage
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', mockToken);

    // Load from storage
    useAuthStore.getState().loadFromStorage();

    const { user, token, isAuthenticated } = useAuthStore.getState();

    expect(user).toEqual(mockUser);
    expect(token).toBe(mockToken);
    expect(isAuthenticated).toBe(true);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('user', 'invalid-json');
    localStorage.setItem('token', 'some-token');

    useAuthStore.getState().loadFromStorage();

    const { user, token, isAuthenticated } = useAuthStore.getState();

    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
  });
});
