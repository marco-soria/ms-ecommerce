import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@features/cart/data-access/cart.service';
import { ProductService } from '@features/catalog/data-access/product.service';
import { StockLabelPipe, StockLevelPipe } from '@shared/pipes/stock-label.pipe';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink, StockLabelPipe, StockLevelPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  /** Bound from the route param `:id` via withComponentInputBinding(). */
  readonly id = input.required<string>();

  readonly product = computed(() =>
    this.productService.products().find((item) => item.id === Number(this.id())),
  );

  readonly loading = this.productService.loading;
  readonly catalogError = this.productService.error;

  quantityOf(): number {
    const product = this.product();
    return product ? this.cartService.quantityOf(product.id) : 0;
  }

  canIncrease(): boolean {
    const product = this.product();
    if (!product || product.stock <= 0) {
      return false;
    }
    return this.cartService.quantityOf(product.id) < product.stock;
  }

  canDecrease(): boolean {
    const product = this.product();
    return product ? this.cartService.quantityOf(product.id) > 0 : false;
  }

  increase(): void {
    const product = this.product();
    if (product) {
      this.cartService.add(product);
    }
  }

  decrease(): void {
    const product = this.product();
    if (product) {
      this.cartService.decrease(product.id);
    }
  }
}
