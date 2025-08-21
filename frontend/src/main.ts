import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// NASA STANDARD: Fail-fast error handling
bootstrapApplication(AppComponent, appConfig).catch(err => {
  console.error('Application failed to start:', err);
  throw new Error('Critical startup failure');
});