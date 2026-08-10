import { Component, inject, signal } from '@angular/core';
import { IProduct } from '../models/product.model';
import { ProductDetails } from '../product-details/product-details';
import { CartService } from '../services/cart.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-catalog',
  imports: [ProductDetails],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  private readonly productService = inject(ProductService);
  readonly cartService = inject(CartService);

  readonly products = signal<IProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the catalog.');
        this.loading.set(false);
      },
    });
  }

  quantityOf(product: IProduct): number {
    return this.cartService.quantityOf(product.id);
  }

  increase(product: IProduct): void {
    this.cartService.add(product);
  }

  decrease(product: IProduct): void {
    this.cartService.decrease(product.id);
  }

  canIncrease(product: IProduct): boolean {
    return product.stock > 0 && this.cartService.quantityOf(product.id) < product.stock;
  }

  canDecrease(product: IProduct): boolean {
    return this.cartService.quantityOf(product.id) > 0;
  }
}
