/**
 * Configuração global da aplicação Angular
 * Define roteamento e interceptors HTTP com JWT automático
 */
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),  // Sistema de rotas com guards
    provideHttpClient(withInterceptors([authInterceptor]))  // HTTP com JWT automático
  ]
};