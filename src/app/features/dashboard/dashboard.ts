import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Auth } from '../../core/auth/auth';

const API = '';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, CommonModule],
  template: `
    <div class="page">
      <div class="page-head">
        <p class="eyebrow">Overview</p>
        <h1 class="page-title">Dashboard</h1>
      </div>

      <div class="card">
        <p class="eyebrow">Total balance</p>
        <p class="balance-figure">₹{{ totalBalance }}</p>
      </div>

      <p class="alert alert-error" *ngIf="errorMsg">{{ errorMsg }}</p>
      <p class="empty" *ngIf="loading">Loading accounts…</p>

      <div class="acct-grid" *ngIf="!loading && accounts.length > 0">
        <div class="card acct" *ngFor="let a of accounts">
          <div class="acct-head">
            <span class="acct-label">{{ a.label }}</span>
            <span class="acct-type">{{ a.accountType }}</span>
          </div>
          <p class="acct-num">xxxx{{ a.accountNumber.slice(-4) }}</p>
          <p class="acct-balance">₹{{ a.balance }}</p>
          <a class="acct-link" [routerLink]="['/transfer']" [queryParams]="{from: a.id}">Transfer →</a>
        </div>
      </div>

      <p class="hint" *ngIf="!loading && accounts.length < 3 && auth.getRole() === 'RETAIL'">
        <a routerLink="/accounts/new" class="acct-link">Open a new account ({{ accounts.length }}/3)</a>
      </p>

      <h2 class="section-title">Recent transactions</h2>
      <div class="card">
        <p class="empty" *ngIf="transactions.length === 0">No recent transactions.</p>
        <div class="tx-list" *ngIf="transactions.length > 0">
          <div class="tx-item" *ngFor="let t of transactions">
            <span class="tx-amount" [class.amount-debit]="t.entryType === 'DEBIT'" [class.amount-credit]="t.entryType !== 'DEBIT'">
              {{ t.entryType === 'DEBIT' ? '−' : '+' }}₹{{ t.amount }}
            </span>
            <span class="tx-ref">{{ t.reference || 'Transfer' }}</span>
            <span class="tx-date">{{ t.occurredAt | date:'short' }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Dashboard implements OnInit {
  accounts: any[] = [];
  transactions: any[] = [];
  totalBalance = 0;
  loading = true;
  errorMsg = '';

  constructor(private http: HttpClient, public auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.post<any[]>(`${API}/api/accounts/me`, {}).subscribe({
      next: (accs) => {
        this.accounts = accs || [];
        this.totalBalance = (accs || []).reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
        this.loading = false;
        this.cdr.detectChanges();
        if (accs && accs.length > 0) {
          // Mirrors the History component: the endpoint returns a bare array, but
          // tolerate a {content: [...]} envelope as well. The error handler
          // matters more than it looks — previously there was none, so a failed
          // request left the panel silently empty with nothing to go on.
          this.http.post<any>(`${API}/api/transactions/search`, {
            accountId: accs[0].id, page: 0, size: 5
          }).subscribe({
            next: (res: any) => {
              this.transactions = Array.isArray(res) ? res : (res?.content || []);
              this.cdr.detectChanges();
            },
            error: () => { this.transactions = []; this.cdr.detectChanges(); }
          });
        }
      },
      error: (e: any) => {
        this.errorMsg = e?.error?.error || e?.message || 'Failed to load accounts';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
