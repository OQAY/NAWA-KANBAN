/**
 * Guard para proteger rotas que requerem autenticação
 * Redireciona para login se usuário não estiver autenticado
 */
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se usuário está autenticado
  if (authService.isAuthenticated) {
    return true;
  }

  // Redireciona para login se não autenticado
  router.navigate(['/login']);
  return false;
};