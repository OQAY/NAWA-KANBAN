/**
 * Validation utilities for form inputs
 * Implements security and UX best practices
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/**
 * Get password strength feedback
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  message: string;
} {
  if (password.length < 6) {
    return { strength: 'weak', message: 'Password is too short' };
  }

  if (password.length < 8) {
    return { strength: 'weak', message: 'Password should be at least 8 characters' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteriasMet = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (criteriasMet <= 2) {
    return { strength: 'medium', message: 'Password could be stronger' };
  }

  return { strength: 'strong', message: 'Strong password!' };
}

/**
 * Trim and sanitize text input
 */
export function sanitizeTextInput(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Validate project/board name
 */
export function isValidBoardName(name: string): boolean {
  const sanitized = sanitizeTextInput(name);
  return sanitized.length >= 3 && sanitized.length <= 100;
}

/**
 * Validate task title
 */
export function isValidTaskTitle(title: string): boolean {
  const sanitized = sanitizeTextInput(title);
  return sanitized.length >= 1 && sanitized.length <= 200;
}

/**
 * Escape special characters for regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
