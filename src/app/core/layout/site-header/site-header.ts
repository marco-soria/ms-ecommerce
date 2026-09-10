import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/data-access/cart.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  readonly cartService = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    this.isDark.set(dark);
    this.applyTheme(dark);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/catalog']);
  }

  toggleDarkMode(): void {
    this.isDark.update((value) => !value);
    this.applyTheme(this.isDark());
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
}
