import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';

const API = '';

const MIN_DEPOSIT: Record<string, string> = { SAVINGS: '1000', SALARY: '0', CURRENT: '10000' };

// Popular companies — merged with registered ones from backend
const COMMON_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Uber',
  'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Intel', 'Cisco', 'Deloitte', 'Accenture',
  'TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Reliance Industries', 'Tata Motors',
  'Flipkart', 'Swiggy', 'Zomato', 'Ola', 'Paytm', 'PhonePe', 'Razorpay', 'Zerodha'
];

interface BizOption {
  id: string;
  companyName: string;
  registered: boolean;
}

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div class="page page-narrow">
      <div class="page-head">
        <p class="eyebrow">Open account</p>
        <h1 class="page-title">New account</h1>
      </div>

      <div class="card">
        <div class="alert alert-warn" *ngIf="tooMany">
          You already have 3 accounts (the maximum for a personal account). Close an existing account first.
        </div>

        <form class="form" (ngSubmit)="create()">
          <div class="field">
            <label for="na-type">Account type</label>
            <select id="na-type" class="control" name="accountType" [(ngModel)]="accountType" (change)="onTypeChange()">
              <option value="SAVINGS">Savings (min ₹1,000)</option>
              <option value="SALARY">Salary (min ₹0)</option>
              <option value="CURRENT" [hidden]="role !== 'BUSINESS'">Current (min ₹10,000)</option>
            </select>
          </div>

          <div class="field">
            <label for="na-label">Label</label>
            <input id="na-label" class="control" type="text" name="label"
                   [(ngModel)]="label" placeholder="e.g. My Savings, Salary Account">
          </div>

          <div class="field">
            <label for="na-deposit">Initial deposit (₹)</label>
            <input id="na-deposit" class="control" type="number" min="0" name="initialDeposit"
                   [(ngModel)]="initialDeposit" [placeholder]="'Minimum ₹' + minDeposit">
          </div>

          <div class="field" *ngIf="accountType === 'SALARY'">
            <label for="na-employer">Employer</label>
            <select id="na-employer" class="control" name="employerBizId" [(ngModel)]="employerBizId" (change)="onEmployerChange()">
              <option value="">Select a company…</option>
              <option disabled>Registered</option>
              <option *ngFor="let b of businesses" [value]="b.id">{{ b.companyName }}</option>
              <option disabled>Other companies</option>
              <option *ngFor="let c of commonUnregistered" [value]="'unreg:' + c">{{ c }}</option>
            </select>
            <p class="hint" *ngIf="selectedEmployer" [class.text-credit]="selectedEmployer.registered" [class.text-warn]="!selectedEmployer.registered">
              {{ selectedEmployer.registered ? 'Registered with the bank' : 'Not registered — recorded for reference' }}
            </p>
          </div>

          <div class="alert alert-error" *ngIf="error">{{ error }}</div>
          <div class="alert alert-success" *ngIf="success">{{ success }}</div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || tooMany">
            {{ loading ? 'Creating…' : 'Create account' }}
          </button>
        </form>
      </div>

      <p class="auth-foot">
        <a routerLink="/dashboard">← Back to dashboard</a>
      </p>
    </div>
  `
})
export class NewAccount implements OnInit {
  accountType = 'SAVINGS';
  label = '';
  initialDeposit = '1000';
  employerBizId = '';
  loading = false;
  error = '';
  success = '';
  role = '';
  minDeposit = '1000';
  tooMany = false;
  businesses: BizOption[] = [];
  commonUnregistered: string[] = [];
  selectedEmployer: BizOption | null = null;

  constructor(private http: HttpClient, private auth: Auth, public router: Router, private cdr: ChangeDetectorRef) {
    this.role = auth.getRole() || '';
    if (this.role === 'BUSINESS') {
      this.accountType = 'CURRENT';
      this.initialDeposit = '10000';
      this.minDeposit = '10000';
    }
  }

  ngOnInit() {
    this.http.post<any[]>(`${API}/api/accounts/me`, {}).subscribe({
      next: (accs) => {
        if (this.role === 'RETAIL' && (accs || []).length >= 3) {
          this.tooMany = true;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
    // Fetch registered businesses and merge with common companies
    this.http.get<any[]>(`${API}/api/accounts/businesses`).subscribe({
      next: (registered) => {
        const regNames = new Set((registered || []).map(r => r.companyName.toLowerCase()));
        this.businesses = (registered || []).map(r => ({ id: r.id, companyName: r.companyName, registered: true }));
        this.commonUnregistered = COMMON_COMPANIES.filter(c => !regNames.has(c.toLowerCase()));
        this.cdr.detectChanges();
      },
      error: () => {
        this.commonUnregistered = COMMON_COMPANIES;
        this.cdr.detectChanges();
      }
    });
  }

  onTypeChange() {
    this.minDeposit = MIN_DEPOSIT[this.accountType] || '1000';
    this.initialDeposit = this.minDeposit;
  }

  onEmployerChange() {
    const val = this.employerBizId;
    if (val.startsWith('unreg:')) {
      this.selectedEmployer = { id: '', companyName: val.replace('unreg:', ''), registered: false };
    } else if (val) {
      this.selectedEmployer = this.businesses.find(b => b.id === val) || null;
    } else {
      this.selectedEmployer = null;
    }
  }

  create() {
    const deposit = Number(this.initialDeposit);
    const min = Number(this.minDeposit);
    if (!this.label.trim()) { this.error = 'Label is required'; return; }
    if (isNaN(deposit) || deposit < min) { this.error = `Minimum deposit is ₹${this.minDeposit}`; return; }
    if (this.accountType === 'SALARY' && !this.employerBizId) {
      this.error = 'Please select an employer'; return;
    }

    this.loading = true; this.error = ''; this.success = '';
    this.cdr.detectChanges();
    const body: any = {
      accountType: this.accountType,
      label: this.label.trim(),
      initialDeposit: deposit
    };
    if (this.accountType === 'SALARY') {
      if (this.employerBizId.startsWith('unreg:')) {
        // Unregistered company — send name, backend records it
        body.employerName = this.employerBizId.replace('unreg:', '');
      } else {
        body.employerBusinessId = this.employerBizId;
      }
    }
    this.http.post<any>(`${API}/api/accounts`, body).subscribe({
      next: (r) => {
        this.success = `${r.accountType} account created — #${r.accountNumber}`;
        this.loading = false; this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (e: any) => {
        this.error = e?.error?.error || e?.message || 'Failed to create account';
        this.loading = false; this.cdr.detectChanges();
      }
    });
  }
}
