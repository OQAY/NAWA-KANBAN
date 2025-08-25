// User model with clear interfaces and validation
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager', 
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
}

// Clear, specific DTOs for user operations
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: UserRole;
}

export interface AuthenticationResponse {
  readonly access_token: string;
  readonly user: User;
}

// Fail-fast validation helpers
export function validateUserRole(role: string): UserRole {
  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(role as UserRole)) {
    throw new Error(`Invalid user role: ${role}`);
  }
  return role as UserRole;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Type guards for runtime safety
export function isValidUser(obj: any): obj is User {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    Object.values(UserRole).includes(obj.role) &&
    obj.createdAt instanceof Date;
}