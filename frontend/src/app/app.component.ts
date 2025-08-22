import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// NASA COMPLIANCE: Component < 60 lines, Single Responsibility
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Kanban';
  
  // NASA STANDARD: Fail-fast validation
  constructor() {
    if (!this.title) {
      throw new Error('App title is required');
    }
  }
}