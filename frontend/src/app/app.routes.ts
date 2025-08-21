import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { KanbanComponent } from './pages/kanban/kanban.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  { path: 'kanban', component: KanbanComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];