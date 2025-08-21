import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const AdminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  const currentUser = authService.currentUser;
  if (currentUser?.role === UserRole.ADMIN) {
    return true;
  }

  // Usuário logado mas não é admin - redireciona para kanban
  router.navigate(['/kanban']);
  return false;
};