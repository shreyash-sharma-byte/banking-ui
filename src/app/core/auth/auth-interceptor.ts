import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const correlationId = crypto.randomUUID();

  let headers = req.headers
    .set('X-Correlation-Id', correlationId);

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const cloned = req.clone({ headers });

  // ── Log Request ──
  const sanitizedHeaders: Record<string, string> = {};
  cloned.headers.keys().forEach(k => {
    const v = cloned.headers.get(k) || '';
    sanitizedHeaders[k] = k === 'Authorization' ? `Bearer ...${v.slice(-10)}` : v;
  });

  console.groupCollapsed(
    `%cREQ %c${cloned.method} %c${cloned.urlWithParams}`,
    'color:#1a237e;font-weight:bold', 'color:#000;font-weight:bold', 'color:#666'
  );
  console.log('Headers:', sanitizedHeaders);
  if (cloned.body) console.log('Body:', cloned.body);
  console.groupEnd();

  return next(cloned).pipe(
    tap({
      next: (event: any) => {
        if (event instanceof HttpResponse) {
          const bodyStr = JSON.stringify(event.body);
          const preview = bodyStr.length > 500 ? bodyStr.substring(0, 500) + '…(truncated)' : bodyStr;
          console.groupCollapsed(
            `%cRES %c${event.status}%c ${cloned.method} ${cloned.urlWithParams}`,
            event.ok ? 'color:#2e7d32;font-weight:bold' : 'color:#c62828;font-weight:bold',
            'color:#000;font-weight:bold', 'color:#666'
          );
          if (bodyStr.length > 500) {
            console.log('Body (truncated):', preview);
            console.log('Full:', event.body);
          } else {
            console.log('Body:', event.body);
          }
          console.groupEnd();
        }
      },
      error: (err: any) => {
        const body = err?.error;
        console.groupCollapsed(
          `%cERR %c${err.status || '???'}%c ${cloned.method} ${cloned.urlWithParams}`,
          'color:#c62828;font-weight:bold', 'color:#c62828;font-weight:bold', 'color:#666'
        );
        console.log('Status:', err.status);
        console.log('Body:', typeof body === 'object' ? body : body);
        console.groupEnd();
      }
    })
  );
};
