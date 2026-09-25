import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@environments/environment';

/**
 * Attaches Supabase publishable key + user JWT (when logged in)
 * to every request targeting the project URL.
 */
export const supabaseInterceptor: HttpInterceptorFn = (req, next) => {
  const { url, publishableKey } = environment.supabase;

  if (!req.url.startsWith(url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const userToken = auth.token();
  const bearer = userToken || publishableKey;

  let headers = req.headers
    .set('apikey', publishableKey)
    .set('Authorization', `Bearer ${bearer}`);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!headers.has('Content-Type')) {
      headers = headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Prefer') && req.url.includes('/rest/v1/')) {
      headers = headers.set('Prefer', 'return=representation');
    }
  }

  return next(req.clone({ headers }));
};
