import { Component, signal } from '@angular/core';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Cart } from './cart/cart';
import { Catalog } from './catalog/catalog';
import { AppView } from './models/app-view.model';
import { SiteHeader } from './site-header/site-header';

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
