import { Routes } from '@angular/router';

// NASA STANDARD: Simple, clear routing configuration
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];