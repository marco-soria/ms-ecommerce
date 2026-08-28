import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CartService } from '@features/cart/data-access/cart.service';
import { CartItem } from '@features/cart/ui/cart-item/cart-item';

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
