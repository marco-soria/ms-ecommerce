import { Component, inject, input, output, signal } from '@angular/core';
import { AppView } from '../models/app-view.model';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-site-header',
  imports: [],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  readonly cartService = inject(CartService);
  readonly currentView = input.required<AppView>();
  readonly favoritesCount = input(0);
  readonly viewChange = output<AppView>();
  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    this.isDark.set(dark);
    this.applyTheme(dark);
  }

  goTo(view: AppView): void {
    this.viewChange.emit(view);
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
