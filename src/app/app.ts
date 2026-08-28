import { Component, signal } from '@angular/core';
import { AppView } from '@core/models/app-view.model';
import { SiteHeader } from '@core/layout/site-header/site-header';
import { Login } from '@features/auth/pages/login/login';
import { Register } from '@features/auth/pages/register/register';
import { Cart } from '@features/cart/pages/cart/cart';
import { Catalog } from '@features/catalog/pages/catalog/catalog';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, Catalog, Cart, Login, Register],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly currentView = signal<AppView>('shop');
  readonly favoritesCount = signal(0);

  setView(view: AppView): void {
    this.currentView.set(view);
  }

  onFavoritesCountChange(count: number): void {
    this.favoritesCount.set(count);
  }
}
