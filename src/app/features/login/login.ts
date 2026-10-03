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
        <p class="eyebrow">Account access</p>
        <h1 class="auth-title">Sign in</h1>
        <p class="auth-sub">Use the email and password you registered with.</p>

        <form class="form" (ngSubmit)="doLogin()">
          <div class="field">
            <label for="login-email">Email</label>
            <input id="login-email" class="control" type="email" name="email"
                   [(ngModel)]="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="field">
            <label for="login-password">Password</label>
            <input id="login-password" class="control" type="password" name="password"
                   [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password">
          </div>

          <div class="alert alert-error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <!-- Demo credentials. Real markup (not CSS-generated) so a visitor can
             select and copy a value straight out of the page. -->
        <div class="demo-access">
          <p class="demo-access__title">Demo accounts</p>
          <table class="demo-access__table">
            <thead>
              <tr><th>Role</th><th>Email</th><th>Password</th></tr>
            </thead>
            <tbody>
              <tr><td>Customer</td><td><code>yash&#64;bank.test</code></td><td><code>Bank&#64;1234</code></td></tr>
              <tr><td>Staff (admin)</td><td><code>staff&#64;bank.test</code></td><td><code>Admin&#64;1234</code></td></tr>
            </tbody>
          </table>
          <p class="demo-access__note">Sample data for evaluation — sign in with either row. Customers see their own accounts; staff see the operations console.</p>
        </div>

        <p class="auth-foot">No account yet? <a routerLink="/register">Create one</a></p>
      </div>
    </div>
  `,
  styles: [`
    /* Demo credentials panel — matches the card's own type scale and rules.
       The prototype components (.card, .eyebrow, .control) are global; only the
       panel is defined here, so nothing else on the page is touched. */
    .demo-access {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }
    .demo-access__title {
      margin: 0 0 10px;
      font-family: var(--mono);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .demo-access__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .demo-access__table th {
      padding: 0 0 6px;
      text-align: left;
      font-family: var(--mono);
      font-size: 0.625rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--faint);
      border-bottom: 1px solid var(--line);
    }
    .demo-access__table td {
      padding: 7px 0;
      color: var(--ink-2);
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .demo-access__table tr:last-child td { border-bottom: 0; }
    .demo-access__table td:first-child {
      padding-right: 10px;
      color: var(--muted);
      white-space: nowrap;
    }
    .demo-access__table code {
      padding: 2px 6px;
      font-family: var(--mono);
      font-size: 0.75rem;
      color: var(--ink);
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      white-space: nowrap;
    }
    .demo-access__note {
      margin: 10px 0 0;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--muted);
    }

    /* Three monospace columns will not fit a narrow phone. Below 400px each row
       stacks (role, then email, then password) and the header row is dropped, so
       no credential is clipped or truncated. */
    @media (max-width: 400px) {
      .demo-access__table thead { display: none; }
      .demo-access__table tr {
        display: block;
        padding: 9px 0;
        border-bottom: 1px solid var(--line);
      }
      .demo-access__table tr:last-child { border-bottom: 0; }
      .demo-access__table td { display: block; padding: 0; border: 0; }
      .demo-access__table td:first-child {
        margin-bottom: 5px;
        font-family: var(--mono);
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .demo-access__table td + td { margin-top: 4px; }
    }
  `]
})
export class Login {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

  doLogin() {
    this.loading = true; this.error = '';
    this.cdr.detectChanges();
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: any) => { this.error = (e?.error?.error) || e?.message || 'Login failed'; this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
