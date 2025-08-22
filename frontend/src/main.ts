/**
 * Ponto de entrada da aplicação Kanban Frontend (Angular 18)
 * Inicializa app com standalone components e configuração global
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Inicializa aplicação com tratamento de erro fail-fast
bootstrapApplication(AppComponent, appConfig).catch(err => {
  console.error('Application failed to start:', err);
  throw new Error('Critical startup failure');
});