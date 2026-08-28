import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@environments/environment';

export const supabaseInterceptor: HttpInterceptorFn = (req, next) => {
  const { url, publishableKey } = environment.supabase;

  if (!req.url.startsWith(url)) {
    return next(req);
  }

  let headers = req.headers
    .set('apikey', publishableKey)
    .set('Authorization', `Bearer ${publishableKey}`);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    headers = headers
      .set('Content-Type', 'application/json')
      .set('Prefer', 'return=representation');
  }

  return next(req.clone({ headers }));
};
