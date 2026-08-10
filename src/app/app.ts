import { Component, signal } from '@angular/core';
import { Cart } from './cart/cart';
import { Catalog } from './catalog/catalog';
import { SiteHeader } from './site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, Catalog, Cart],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('ms-ecommerce');
}
