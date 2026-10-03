import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../core/auth/auth';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <div class="auth-wrap">
      <div class="card auth-card">
        <p class="eyebrow">New customer</p>
        <h1 class="auth-title">Create account</h1>
        <p class="auth-sub">A personal account can hold up to 3 sub-accounts.</p>

        <form class="form" (ngSubmit)="doRegister()">
          <div class="field">
            <label for="reg-role">Account type</label>
            <select id="reg-role" class="control" name="role" [(ngModel)]="role">
              <option value="RETAIL">Personal</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
          <div class="field">
            <label for="reg-email">Email</label>
            <input id="reg-email" class="control" type="email" name="email"
                   [(ngModel)]="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="field">
            <label for="reg-password">Password</label>
            <input id="reg-password" class="control" type="password" name="password"
                   [(ngModel)]="password" placeholder="Choose a password" autocomplete="new-password">
            <p class="hint">Minimum 8 characters, with one uppercase, one digit and one special character.</p>
          </div>

          <div class="alert alert-error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="auth-foot">Already registered? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `
})
export class Register {
  email = ''; password = ''; role = 'RETAIL';
  error = ''; loading = false;

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

  doRegister() {
    this.loading = true; this.error = '';
    this.cdr.detectChanges();
    this.auth.register(this.email, this.password, this.role).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error = (e?.error?.error) || e?.message || 'Registration failed'; this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
