import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

const API = '';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  userId: string;
  expiresIn: number;
}

export interface UserInfo {
  userId: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/api/auth/login`, { email, password })
      .pipe(tap(res => this.storeSession(res)));
  }

  register(email: string, password: string, role?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/api/auth/register`, { email, password, role })
      .pipe(tap(res => this.storeSession(res)));
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${API}/api/auth/logout`, {}, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  me(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${API}/api/auth/me`);
  }

  refreshToken(): Observable<AuthResponse> {
    const refresh = localStorage.getItem('refreshToken');
    return this.http.post<AuthResponse>(`${API}/api/auth/refresh`, { refreshToken: refresh })
      .pipe(tap(res => this.storeSession(res)));
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  getUserId(): string | null { return localStorage.getItem('userId'); }
  getRole(): string | null { return localStorage.getItem('role'); }
  isAuthenticated(): boolean { return !!this.getToken(); }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('userId', res.userId);
    // Decode JWT to get role (payload is second segment)
    try {
      const payload = JSON.parse(atob(res.token.split('.')[1]));
      localStorage.setItem('role', payload.role);
    } catch(e) { /* ignore */ }
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
  }
}
