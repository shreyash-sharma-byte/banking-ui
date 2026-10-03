import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../core/auth/auth';

@Component({
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="page">
      <div class="page-head">
        <p class="eyebrow">Banking platform</p>
        <h1 class="page-title">Ledger</h1>
        <p class="page-sub">
          A production-shaped banking platform built as eight Spring Boot services behind
          an API gateway: database-per-service, an event-driven payment pipeline over
          Kafka, and an immutable unified ledger. It is built to show a reviewer how real
          money movement works, not a toy CRUD app.
        </p>
      </div>

      <div class="entry">
        <p class="entry-copy">A running application with real seeded data &mdash; not a mock-up.</p>
        <div *ngIf="auth.isAuthenticated(); else guestTop">
          <a class="btn btn-primary" routerLink="/dashboard">Go to dashboard</a>
        </div>
        <ng-template #guestTop>
          <a class="btn btn-primary" routerLink="/login">Sign in</a>
          <p class="hint">Demo credentials are shown on the sign-in page &mdash; RETAIL or BUSINESS roles.</p>
        </ng-template>
      </div>

      <section>
        <h2 class="section-title">Architecture</h2>

        <div class="arch">
          <div class="tier">
            <span class="tier-label">Client</span>
            <span class="node">banking-ui &mdash; Angular 22 SPA</span>
          </div>

          <p class="arrow">HTTPS &middot; bearer token &darr;</p>

          <div class="tier">
            <span class="tier-label">Edge</span>
            <span class="node">
              <b>api-gateway</b> <span class="port">:8080</span> &mdash; validates the JWT
              against auth-service on every request, attaches a correlation ID, routes by
              path
            </span>
          </div>

          <p class="arrow">/api/** &darr;</p>

          <div class="tier tier--stack">
            <span class="tier-label">Services</span>
            <ul class="node-grid">
              <li class="node"><b>auth-service</b> <span class="port">:8081</span><span class="db">auth_db</span></li>
              <li class="node"><b>account-service</b> <span class="port">:8082</span><span class="db">account_db</span></li>
              <li class="node"><b>payment-service</b> <span class="port">:8083</span><span class="db">payment_db</span></li>
              <li class="node"><b>transaction-service</b> <span class="port">:8084</span><span class="db">transaction_db</span></li>
              <li class="node"><b>notification-service</b> <span class="port">:8085</span><span class="db">notification_db</span></li>
              <li class="node node--infra"><b>config-server</b> <span class="port">:8888</span> &middot; <b>eureka-server</b> <span class="port">:8761</span> &mdash; config + discovery</li>
            </ul>
          </div>

          <p class="arrow">outbox &rarr; Kafka &darr;</p>

          <div class="tier">
            <span class="tier-label">Event bus</span>
            <span class="node">
              <b>Kafka</b> &mdash; <span class="mono">payment-events</span> &middot;
              <span class="mono">ledger-batches</span> &middot;
              <span class="mono">ledger-confirm</span>
            </span>
          </div>
        </div>

        <h3 class="sub-title">What happens on a transfer</h3>
        <ol class="steps">
          <li>The browser calls <span class="mono">POST /api/payments/transfer</span> with a bearer token.</li>
          <li>
            <b>api-gateway</b> validates the token against
            <span class="mono">GET /api/auth/validate</span>, attaches a correlation ID, and
            routes to payment-service. Services reject direct access without the gateway
            secret, so the gateway cannot be bypassed.
          </li>
          <li>
            <b>payment-service</b> checks the idempotency key first, so a retried request
            cannot move money twice.
          </li>
          <li>
            It calls <b>account-service</b>, which debits and credits inside
            <b>one ACID transaction</b> using <span class="mono">UPDATE &hellip; WHERE balance &gt;= ?</span>.
            Two concurrent transfers can never overdraw an account. Keeping this atomic is
            a deliberate decision &mdash; it replaces a Saga in the MVP.
          </li>
          <li>
            The ledger entry is written to the payment outbox as <span class="mono">PENDING</span>.
            A poller claims rows with <span class="mono">SELECT &hellip; FOR UPDATE SKIP LOCKED</span>
            so two workers never take the same batch, and a 10-second scheduler publishes
            them to Kafka.
          </li>
          <li>
            <b>transaction-service</b> appends the batch to the immutable ledger &mdash;
            <span class="mono">ON CONFLICT DO NOTHING</span> makes a redelivery a no-op &mdash;
            then publishes <span class="mono">ledger-confirm</span>, which moves the entry to
            <span class="mono">PUBLISHED</span>.
          </li>
          <li>
            In parallel, <span class="mono">payment-events</span> reaches notification-service,
            which records the customer alert.
          </li>
        </ol>
      </section>

      <section>
        <h2 class="section-title">Services &amp; data</h2>
        <div class="cap-list">
          <div class="cap">
            <span class="cap-label">Database-per-service</span>
            <span class="cap-desc">
              Five PostgreSQL databases &mdash; auth, account, payment, transaction,
              notification &mdash; with no shared tables. Cross-service reads go through
              HTTP, never a join, and ownership is enforced in the application layer.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Immutable unified ledger</span>
            <span class="cap-desc">
              transaction-service is append-only and the single source of truth for history
              and reporting. Nothing edits it in place; every service that moves money feeds
              it through the outbox.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Payment and ledger stay separate</span>
            <span class="cap-desc">
              Orchestration and the ledger are different services with different databases,
              so the ledger can be rebuilt from events without touching the payment path.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Salary &rarr; savings lifecycle</span>
            <span class="cap-desc">
              Removing an employee from a business converts their SALARY accounts to SAVINGS
              automatically, with the change written to the audit trail.
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title">Events (Kafka)</h2>
        <div class="cap-list">
          <div class="cap">
            <span class="cap-label mono">payment-events</span>
            <span class="cap-desc">
              Published by payment-service (1s poller) &rarr; consumed by notification-service.
              Fires on every transfer.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label mono">ledger-batches</span>
            <span class="cap-desc">
              Published by payment-service (10s poller) &rarr; consumed by transaction-service.
              Bulk ledger entries &mdash; one batch, not one message per row.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label mono">ledger-confirm</span>
            <span class="cap-desc">
              Published by transaction-service &rarr; consumed by payment-service.
              <span class="mono">COMMITTED</span> or <span class="mono">FAILED</span>, which is
              what returns an outbox row to <span class="mono">PUBLISHED</span>.
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title">Decisions, not just features</h2>
        <div class="cap-list">
          <div class="cap">
            <span class="cap-label">Dual outbox schedulers</span>
            <span class="cap-desc">
              Notifications poll every second so a customer alert is prompt; ledger batches
              poll every ten so the ledger is written in bulk. Different audiences, different
              latency budgets.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Idempotency at every level</span>
            <span class="cap-desc">
              Duplicate payment requests are rejected, <span class="mono">batch_id</span>
              prevents double ledger inserts, and <span class="mono">ON CONFLICT DO NOTHING</span>
              makes retries safe. At-least-once delivery is turned into exactly-once effect.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">JWT auth, refresh rotation + blacklist</span>
            <span class="cap-desc">
              One-hour access tokens, seven-day refresh tokens rotated on use and stored
              SHA-256 hashed, blacklist-based logout, bcrypt password hashing.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Role-based access control</span>
            <span class="cap-desc">
              RETAIL, BUSINESS, EMPLOYEE, ADMIN and AUDITOR &mdash; enforced at the gateway
              and re-checked inside each service, so a compromised route is not enough.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Distributed tracing</span>
            <span class="cap-desc">
              A correlation ID is attached at the gateway and propagated across every
              inter-service call, so one transfer can be followed through Zipkin end to end.
            </span>
          </div>
          <div class="cap">
            <span class="cap-label">Error recovery, not just error handling</span>
            <span class="cap-desc">
              A failed ledger sync moves the outbox row to ERROR with the reason recorded, and
              the client is told rather than left guessing.
            </span>
          </div>
        </div>
      </section>

      <p class="stack">
        8 Spring Boot services &middot; Java 17 &middot; Spring Cloud Gateway &middot; Eureka &middot;
        Config Server &middot; PostgreSQL 16 &middot; Apache Kafka &middot; Zipkin &middot;
        Angular 22 &middot; 76 JUnit tests &middot; 9 ADRs &middot; 37 documented flows
      </p>

      <div class="cta" *ngIf="auth.isAuthenticated(); else guest">
        <a class="btn btn-primary" routerLink="/dashboard">Go to dashboard</a>
      </div>
      <ng-template #guest>
        <div class="cta">
          <a class="btn btn-primary" routerLink="/login">Sign in</a>
          <p class="hint">Demo credentials are shown on the sign-in page &mdash; RETAIL or BUSINESS roles.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    /* ---- architecture ---- */
    .arch {
      border-top: 1px solid var(--line);
      padding-top: 16px;
    }

    .tier {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
    }

    .tier-label {
      font-family: var(--mono);
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .node {
      font-size: 0.875rem;
      color: var(--ink-2);
      line-height: 1.5;
    }

    .node b {
      color: var(--ink);
      font-weight: 600;
    }

    .port,
    .mono {
      font-family: var(--mono);
      font-size: 0.8125rem;
      color: var(--ink);
    }

    .db {
      display: inline-block;
      margin-left: 8px;
      font-family: var(--mono);
      font-size: 0.75rem;
      color: var(--muted);
      border: 1px solid var(--line-2);
      border-radius: var(--radius);
      padding: 0 5px;
    }

    .node-grid {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .node-grid .node {
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
    }

    .node--infra {
      grid-column: 1 / -1;
    }

    .arrow {
      margin: 8px 0;
      padding-left: 12px;
      font-family: var(--mono);
      font-size: 0.75rem;
      color: var(--muted);
    }

    .sub-title {
      margin: 24px 0 8px;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ink);
    }

    .steps {
      margin: 0;
      padding-left: 20px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }

    .steps li {
      margin-bottom: 10px;
      font-size: 0.875rem;
      color: var(--ink-2);
      line-height: 1.55;
    }

    .steps li::marker {
      font-family: var(--mono);
      color: var(--muted);
    }

    .steps b {
      color: var(--ink);
      font-weight: 600;
    }

    /* ---- entry point ---- */
    .entry {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 16px 0;
    }

    .entry-copy {
      font-size: 0.875rem;
      color: var(--ink-2);
      margin-bottom: 12px;
    }

    .entry .hint {
      margin-top: 8px;
    }

    /* ---- capability lists ---- */
    .cap-list {
      border-top: 1px solid var(--line);
    }

    .cap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
    }

    .cap-label {
      font-weight: 600;
      color: var(--ink);
    }

    .cap-label.mono {
      font-weight: 500;
    }

    .cap-desc {
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.55;
    }

    .stack {
      margin: 24px 0 0;
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.6;
    }

    .cta {
      margin-top: 24px;
    }

    .cta .hint {
      margin-top: 8px;
    }

    @media (min-width: 640px) {
      .node-grid {
        grid-template-columns: 1fr 1fr;
      }

      .cap {
        flex-direction: row;
        align-items: baseline;
        gap: 24px;
      }

      .cap-label {
        flex: 0 0 300px;
      }

      .cap-desc {
        flex: 1 1 auto;
      }
    }

    @media (min-width: 960px) {
      .tier {
        padding: 14px 16px;
      }
    }
  `]
})
export class Welcome {
  constructor(public auth: Auth) {}
}
