import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CartItem } from '../cart-item/cart-item';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [CartItem, CurrencyPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  readonly cartService = inject(CartService);

  onQuantityChange(productId: number, quantity: number): void {
    this.cartService.setQuantity(productId, quantity);
  }

  onRemove(productId: number): void {
    this.cartService.remove(productId);
  }

  clearCart(): void {
    this.cartService.clear();
  }
}
