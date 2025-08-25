/**
 * Serviço de autenticação com gerenciamento de estado reativo
 * Implementa persistência no localStorage e streams RxJS para reatividade
 */
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import {
  User,
  LoginCredentials,
  CreateUserRequest,
  AuthenticationResponse,
} from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:3000";

  // BehaviorSubjects para estado reativo (sempre emitem último valor)
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  // Observables públicos para componentes se inscreverem
  currentUser$ = this.currentUserSubject.asObservable();
  token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth(); // Carrega auth persistido no localStorage
  }

  login(credentials: LoginCredentials): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => this.setAuth(response.access_token, response.user))
      );
  }

  register(userData: CreateUserRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap((response) => this.setAuth(response.access_token, response.user))
      );
  }

  logout(): void {
    this.clearAuth();
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/profile`);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.tokenSubject.value && !!this.currentUser;
  }

  // Recupera autenticação persistida na inicialização da app
  private loadStoredAuth(): void {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("current_user");

    if (token && userStr) {
      const user = JSON.parse(userStr);
      this.tokenSubject.next(token);
      this.currentUserSubject.next(user);
    }
  }

  // Persiste auth no localStorage e atualiza estado reativo
  private setAuth(token: string, user: User): void {
    localStorage.setItem("access_token", token);
    localStorage.setItem("current_user", JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
  }

  private clearAuth(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }
}
