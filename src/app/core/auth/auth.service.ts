import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { Observable, catchError, map, throwError } from 'rxjs';
import { User } from './user.model';

const TOKEN_STORAGE_KEY = 'ms-ecommerce-access-token';
const USER_STORAGE_KEY = 'ms-ecommerce-user';

interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
}

interface JwtPayload {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<User | null>(null);
  private readonly accessToken = signal<string | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly token = this.accessToken.asReadonly();
  readonly isLoggedIn = computed(() => this.accessToken() !== null);

  constructor() {
    this.restoreSession();
  }

  login(email: string, password: string): Observable<User> {
    const url = `${environment.supabase.url}/auth/v1/token?grant_type=password`;

    return this.http.post<AuthTokenResponse>(url, { email, password }).pipe(
      map((response) => {
        const token = response.access_token;
        const user = this.buildUser(email, token, response);
        this.persistSession(token, user);
        return user;
      }),
      catchError((error: unknown) => {
        console.error('Login failed', error);
        return throwError(
          () => new Error('Invalid email or password. Please try again.'),
        );
      }),
    );
  }

  register(name: string, email: string, password: string): Observable<User> {
    const url = `${environment.supabase.url}/auth/v1/signup`;

    return this.http
      .post<AuthTokenResponse>(url, {
        email,
        password,
        data: { full_name: name, name },
      })
      .pipe(
        map((response) => {
          if (response.access_token) {
            const user = this.buildUser(email, response.access_token, response);
            this.persistSession(response.access_token, {
              ...user,
              name: name || user.name,
            });
            return { ...user, name: name || user.name };
          }

          // Email confirmation may be required; keep a local session for the lab flow.
          const user = { name, email };
          this.currentUser.set(user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          return user;
        }),
        catchError((error: unknown) => {
          console.error('Registration failed', error);
          return throwError(
            () => new Error('Could not create the account. Please try again.'),
          );
        }),
      );
  }

  logout(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  private persistSession(token: string, user: User): void {
    this.accessToken.set(token);
    this.currentUser.set(user);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  private restoreSession(): void {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);

    if (!token) {
      return;
    }

    const payload = this.decodeJwt(token);
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      this.logout();
      return;
    }

    this.accessToken.set(token);

    if (rawUser) {
      try {
        this.currentUser.set(JSON.parse(rawUser) as User);
        return;
      } catch {
        // Fall through and rebuild from JWT.
      }
    }

    const email = payload?.email ?? 'user@example.com';
    this.currentUser.set(this.buildUser(email, token));
  }

  private buildUser(
    email: string,
    token: string,
    response?: AuthTokenResponse,
  ): User {
    const payload = this.decodeJwt(token);
    const name =
      response?.user?.user_metadata?.full_name ||
      response?.user?.user_metadata?.name ||
      payload?.user_metadata?.full_name ||
      payload?.user_metadata?.name ||
      email.split('@')[0] ||
      'User';

    return {
      name,
      email: response?.user?.email || payload?.email || email,
    };
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
