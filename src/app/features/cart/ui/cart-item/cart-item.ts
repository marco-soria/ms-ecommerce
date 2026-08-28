import { Component, input, model, output } from '@angular/core';
import { IProduct } from '../models/product.model';
import { ProductDetails } from '../product-details/product-details';

@Component({
  selector: 'app-cart-item',
  imports: [ProductDetails],
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css',
})
export class CartItem {
  readonly product = input.required<IProduct>();
  readonly quantity = model.required<number>();
  readonly remove = output<void>();

  increase(): void {
    const product = this.product();
    if (this.quantity() < product.stock) {
      this.quantity.update((value) => value + 1);
    }
  }

  decrease(): void {
    if (this.quantity() > 1) {
      this.quantity.update((value) => value - 1);
    } else {
      this.remove.emit();
    }
  }
}
