import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="user-info" *ngIf="currentUser">
        <h3>Bem-vindo, {{ currentUser.name }}!</h3>
        <p>Email: {{ currentUser.email }}</p>
        <p>Role: {{ currentUser.role }}</p>
        <button (click)="logout()">Sair</button>
      </div>
      
      <div class="content">
        <h2>Dashboard</h2>
        <p>Sistema funcionando!</p>
        <button (click)="goToKanban()" class="kanban-btn">Ver Kanban Board</button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .user-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .user-info button {
      background: #dc3545;
      color: white;
      border: none;
      padding: 5px 15px;
      border-radius: 3px;
      cursor: pointer;
    }
    .content {
      background: white;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .kanban-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 3px;
      cursor: pointer;
      margin-top: 10px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToKanban(): void {
    this.router.navigate(['/kanban']);
  }
}