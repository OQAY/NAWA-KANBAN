import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// Simple root component following Single Responsibility
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Kanban';
  
  // Basic validation
  constructor() {
    if (!this.title) {
      throw new Error('App title is required');
    }
  }
}