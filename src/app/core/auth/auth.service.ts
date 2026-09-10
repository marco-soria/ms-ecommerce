import { Injectable, computed, signal } from '@angular/core';
import { User } from './user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  login(user: User): void {
    this.currentUser.set(user);
  }

  logout(): void {
    this.currentUser.set(null);
  }
}
