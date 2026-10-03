import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Auth } from '../../core/auth/auth';

const API = '';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, CommonModule],
  template: `
    <div class="page">
      <div class="page-head">
        <p class="eyebrow">Ledger</p>
        <h1 class="page-title">Transaction history</h1>
      </div>

      <div class="card">
        <div class="filters">
          <div class="field">
            <label for="h-type">Type</label>
            <select id="h-type" class="control" name="filterType" [(ngModel)]="filterType" (change)="load()">
              <option value="">All types</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
          <div class="field">
            <label for="h-min">Min ₹</label>
            <input id="h-min" class="control" type="number" name="filterMin" [(ngModel)]="filterMin" (change)="load()" placeholder="Min ₹">
          </div>
          <div class="field">
            <label for="h-max">Max ₹</label>
            <input id="h-max" class="control" type="number" name="filterMax" [(ngModel)]="filterMax" (change)="load()" placeholder="Max ₹">
          </div>
          <div class="field">
            <label for="h-from">From</label>
            <input id="h-from" class="control" type="date" name="filterFrom" [(ngModel)]="filterFrom" (change)="load()">
          </div>
          <div class="field">
            <label for="h-to">To</label>
            <input id="h-to" class="control" type="date" name="filterTo" [(ngModel)]="filterTo" (change)="load()">
          </div>
        </div>

        <p class="empty" *ngIf="transactions.length === 0">No transactions match.</p>

        <div class="tx-table" *ngIf="transactions.length > 0">
          <div class="tx-head">
            <div>Date</div>
            <div>Type</div>
            <div class="tx-cell-amt">Amount</div>
            <div>Reference</div>
          </div>
          <div class="tx-row" *ngFor="let t of transactions">
            <div class="tx-cell" data-label="Date">{{ t.occurredAt | date:'short' }}</div>
            <div class="tx-cell" data-label="Type">
              <span class="badge" [class.badge-debit]="t.entryType === 'DEBIT'" [class.badge-credit]="t.entryType !== 'DEBIT'">{{ t.entryType }}</span>
            </div>
            <div class="tx-cell tx-cell-amt" data-label="Amount">
              <span class="amount" [class.amount-debit]="t.entryType === 'DEBIT'" [class.amount-credit]="t.entryType !== 'DEBIT'">
                {{ t.entryType === 'DEBIT' ? '−' : '+' }}₹{{ t.amount }}
              </span>
            </div>
            <div class="tx-cell" data-label="Reference">{{ t.reference || '—' }}</div>
          </div>
        </div>

        <div class="pager">
          <button class="btn btn-ghost btn-sm" (click)="page = page - 1; load()" [disabled]="page === 0">Previous</button>
          <span class="pager-info">Page {{ page + 1 }}</span>
          <button class="btn btn-ghost btn-sm" (click)="page = page + 1; load()">Next</button>
        </div>
      </div>
    </div>
  `
})
export class History implements OnInit {
  transactions: any[] = [];
  page = 0;
  filterType = ''; filterMin = ''; filterMax = ''; filterFrom = ''; filterTo = '';

  constructor(private http: HttpClient, private auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.post<any[]>(`${API}/api/accounts/me`, {}).subscribe({
      next: (accs) => {
        if (!accs || accs.length === 0) { this.transactions = []; this.cdr.detectChanges(); return; }
        const body: any = { page: this.page, size: 15 };
        body.accountId = accs[0].id;
        if (this.filterType) body.type = this.filterType;
        if (this.filterMin) body.minAmount = this.filterMin;
        if (this.filterMax) body.maxAmount = this.filterMax;
        if (this.filterFrom) body.startDate = this.filterFrom;
        if (this.filterTo) body.endDate = this.filterTo;
        this.http.post<any>(`${API}/api/transactions/search`, body).subscribe({
          next: (res: any) => { this.transactions = Array.isArray(res) ? res : (res?.content || []); this.cdr.detectChanges(); },
          error: () => { this.transactions = []; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.transactions = []; this.cdr.detectChanges(); }
    });
  }
}
