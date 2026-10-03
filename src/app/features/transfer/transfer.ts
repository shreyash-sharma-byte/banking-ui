import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '../../core/auth/auth';

const API = '';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="page page-narrow">
      <div class="page-head">
        <p class="eyebrow">Move money</p>
        <h1 class="page-title">Transfer</h1>
      </div>

      <div class="card">
        <form class="form" (ngSubmit)="doTransfer()">
          <div class="field">
            <label for="tf-from">From account</label>
            <select id="tf-from" class="control" name="fromAccount" [(ngModel)]="fromAccount">
              <option value="">Select account…</option>
              <option *ngFor="let a of accounts" [value]="a.id">
                {{ a.label }} · {{ a.accountType }} · xxxx{{ a.accountNumber.slice(-4) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="tf-to">To account</label>
            <input id="tf-to" class="control" type="text" name="searchQuery"
                   [(ngModel)]="searchQuery" (input)="onSearch()"
                   placeholder="Type account number or name…" autocomplete="off">
            <div class="search-results" *ngIf="searchResults.length > 0">
              <div class="search-item" *ngFor="let r of searchResults" (click)="selectRecipient(r)"
                   [class.selected]="r.id === toAccount">
                <div class="search-item-name">{{ r.ownerName }}</div>
                <div class="search-item-sub">{{ r.accountType }} · xxxx{{ r.accountNumber.slice(-4) }}</div>
              </div>
            </div>
            <p class="hint" *ngIf="searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && !searching && !toAccount">
              No accounts found.
            </p>
          </div>

          <div class="field">
            <label for="tf-amount">Amount (₹)</label>
            <input id="tf-amount" class="control" type="number" min="0" name="amount"
                   [(ngModel)]="amount" placeholder="0.00">
          </div>

          <div class="field">
            <label for="tf-remark">Remark</label>
            <input id="tf-remark" class="control" type="text" name="remark"
                   [(ngModel)]="remark" placeholder="Optional">
          </div>

          <div class="alert alert-success" *ngIf="success">{{ success }}</div>
          <div class="alert alert-error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || !fromAccount || !toAccount">
            {{ loading ? 'Sending…' : 'Send ₹' + (amount || 0) }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class Transfer implements OnInit {
  accounts: any[] = [];
  fromAccount = ''; toAccount = '';
  searchQuery = '';
  searchResults: any[] = [];
  searching = false;
  amount = ''; remark = '';
  loading = false; success = ''; error = '';
  private searchTimer: any = null;

  constructor(private http: HttpClient, private auth: Auth, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.post<any[]>(`${API}/api/accounts/me`, {}).subscribe(accs => {
      this.accounts = accs || [];
      this.route.queryParams.subscribe(p => { if (p['from']) this.fromAccount = p['from']; });
      this.cdr.detectChanges();
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    const q = this.searchQuery.trim();
    if (q.length < 2) { this.searchResults = []; return; }
    this.searching = true;
    this.searchTimer = setTimeout(() => {
      this.http.get<any[]>(`${API}/api/accounts/lookup?q=${encodeURIComponent(q)}`).subscribe({
        next: (r) => { this.searchResults = r || []; this.searching = false; this.cdr.detectChanges(); },
        error: () => { this.searchResults = []; this.searching = false; this.cdr.detectChanges(); }
      });
    }, 300);
  }

  selectRecipient(r: any) {
    this.toAccount = r.id;
    this.searchQuery = `${r.ownerName} · xxxx${r.accountNumber.slice(-4)}`;
    this.searchResults = [];
  }

  doTransfer() {
    this.loading = true; this.error = ''; this.success = '';
    const idemKey = crypto.randomUUID();
    const body = { fromAccount: this.fromAccount, toAccount: this.toAccount, amount: Number(this.amount), remark: this.remark };
    const headers = new HttpHeaders({ 'Idempotency-Key': idemKey });
    this.http.post<any>(`${API}/api/payments/transfer`, body, { headers }).subscribe({
      next: (r: any) => { this.success = `Sent ₹${this.amount}. Txn: ${r.paymentId}`; this.loading = false; },
      error: (e: any) => { this.error = (e?.error?.error) || e?.message || 'Transfer failed'; this.loading = false; }
    });
  }
}
