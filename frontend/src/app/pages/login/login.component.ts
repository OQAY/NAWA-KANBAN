import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-form">
        <div class="form-tabs">
          <button 
            type="button" 
            class="tab-button" 
            [class.active]="!isRegisterMode"
            (click)="switchToLogin()">
            Login
          </button>
          <button 
            type="button" 
            class="tab-button" 
            [class.active]="isRegisterMode"
            (click)="switchToRegister()">
            Criar Conta
          </button>
        </div>
        
        <!-- LOGIN FORM -->
        <form *ngIf="!isRegisterMode" [formGroup]="loginForm" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>Email ou Usuário:</label>
            <input type="text" formControlName="emailOrUsername" placeholder="Digite seu email ou nome de usuário" />
            <div *ngIf="loginForm.get('emailOrUsername')?.errors?.['required'] && loginForm.get('emailOrUsername')?.touched">
              Email ou usuário é obrigatório
            </div>
          </div>

          <div class="form-group">
            <label>Senha:</label>
            <div class="password-input-container">
              <input [type]="showPassword ? 'text' : 'password'" formControlName="password" />
              <button type="button" class="password-toggle" (click)="togglePasswordVisibility()">
                <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2"/>
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
            <div *ngIf="loginForm.get('password')?.errors?.['required'] && loginForm.get('password')?.touched">
              Senha é obrigatória
            </div>
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading">
            {{ isLoading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <!-- REGISTER FORM -->
        <form *ngIf="isRegisterMode" [formGroup]="registerForm" (ngSubmit)="onRegister()">
          <div class="form-group">
            <label>Nome de Usuário:</label>
            <input type="text" formControlName="username" placeholder="Digite um nome de usuário" />
            <div *ngIf="registerForm.get('username')?.errors?.['required'] && registerForm.get('username')?.touched">
              Nome de usuário é obrigatório
            </div>
          </div>

          <div class="form-group">
            <label>Email:</label>
            <input type="email" formControlName="email" placeholder="Digite seu email" />
            <div *ngIf="registerForm.get('email')?.errors?.['required'] && registerForm.get('email')?.touched">
              Email é obrigatório
            </div>
            <div *ngIf="registerForm.get('email')?.errors?.['email'] && registerForm.get('email')?.touched">
              Email deve ter um formato válido
            </div>
          </div>

          <div class="form-group">
            <label>Senha:</label>
            <div class="password-input-container">
              <input [type]="showRegisterPassword ? 'text' : 'password'" formControlName="password" placeholder="Digite sua senha" />
              <button type="button" class="password-toggle" (click)="toggleRegisterPasswordVisibility()">
                <svg *ngIf="!showRegisterPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg *ngIf="showRegisterPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2"/>
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
            <div *ngIf="registerForm.get('password')?.errors?.['required'] && registerForm.get('password')?.touched">
              Senha é obrigatória
            </div>
            <div *ngIf="registerForm.get('password')?.errors?.['minlength'] && registerForm.get('password')?.touched">
              Senha deve ter no mínimo 6 caracteres
            </div>
          </div>

          <button type="submit" [disabled]="registerForm.invalid || isLoading">
            {{ isLoading ? 'Criando conta...' : 'Criar Conta' }}
          </button>
        </form>

        <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
        <div *ngIf="successMessage" class="success">{{ successMessage }}</div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 80px);
      padding: 20px;
    }
    .login-form {
      border: 1px solid #ccc;
      padding: 0;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      background: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .form-tabs {
      display: flex;
      border-bottom: 1px solid #e9ecef;
    }
    .tab-button {
      flex: 1;
      padding: 15px 20px;
      background: #f8f9fa;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border-radius: 8px 8px 0 0;
    }
    .tab-button:first-child {
      border-right: 1px solid #e9ecef;
    }
    .tab-button.active {
      background: white;
      color: #1976d2;
      border-bottom: 2px solid #1976d2;
    }
    .tab-button:hover:not(.active) {
      background: #e9ecef;
    }
    form {
      padding: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      box-sizing: border-box;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }
    input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }
    input::placeholder {
      color: #6c757d;
    }
    .password-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-container input {
      padding-right: 50px;
    }
    .password-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: #6c757d;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      margin: 0;
      transition: color 0.3s ease;
    }
    .password-toggle:hover {
      color: #1976d2;
    }
    .password-toggle svg {
      width: 20px;
      height: 20px;
    }
    button[type="submit"] {
      width: 100%;
      padding: 12px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: background-color 0.3s ease;
      margin-top: 10px;
    }
    button[type="submit"]:hover:not(:disabled) {
      background-color: #1565c0;
    }
    button[type="submit"]:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    .error {
      color: #dc3545;
      margin-top: 15px;
      text-align: center;
      padding: 10px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
    .success {
      color: #155724;
      margin-top: 15px;
      text-align: center;
      padding: 10px;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
    }
    .form-group div {
      color: #dc3545;
      font-size: 12px;
      margin-top: 4px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoading = false;
  isRegisterMode = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showRegisterPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      emailOrUsername: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  switchToLogin(): void {
    this.isRegisterMode = false;
    this.clearMessages();
  }

  switchToRegister(): void {
    this.isRegisterMode = true;
    this.clearMessages();
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRegisterPasswordVisibility(): void {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.clearMessages();
      
      const formValue = this.loginForm.value;
      const loginData = {
        email: formValue.emailOrUsername,
        password: formValue.password
      };

      this.authService.login(loginData).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else if (error.status === 401) {
            this.errorMessage = 'Email/usuário ou senha incorretos.';
          } else if (error.status === 404) {
            this.errorMessage = 'Usuário não encontrado.';
          } else {
            this.errorMessage = 'Erro no login. Tente novamente.';
          }
          this.isLoading = false;
        }
      });
    }
  }

  onRegister(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.clearMessages();
      
      const formValue = this.registerForm.value;
      const registerData = {
        name: formValue.username,
        email: formValue.email,
        password: formValue.password,
        role: UserRole.DEVELOPER
      };
      
      this.authService.register(registerData).subscribe({
        next: () => {
          this.successMessage = 'Conta criada com sucesso! Você pode fazer login agora.';
          this.isLoading = false;
          this.registerForm.reset();
          setTimeout(() => {
            this.switchToLogin();
          }, 2000);
        },
        error: (error) => {
          console.error('Register error:', error);
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else if (error.status === 409 || error.status === 400) {
            if (error.error?.details?.includes('email') || error.error?.message?.toLowerCase()?.includes('email')) {
              this.errorMessage = 'Este email já está em uso. Tente outro email.';
            } else if (error.error?.details?.includes('username') || error.error?.message?.toLowerCase()?.includes('username')) {
              this.errorMessage = 'Este nome de usuário já está em uso. Tente outro.';
            } else {
              this.errorMessage = 'Usuário ou email já existe. Tente outros dados.';
            }
          } else {
            this.errorMessage = 'Erro ao criar conta. Tente novamente.';
          }
          this.isLoading = false;
        }
      });
    }
  }
}