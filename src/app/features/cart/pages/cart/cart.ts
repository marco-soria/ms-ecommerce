import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '@features/cart/data-access/cart.service';
import { CartItem } from '@features/cart/ui/cart-item/cart-item';

@Component({
  selector: 'app-cart',
  imports: [CartItem, CurrencyPipe, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  onQuantityChange(productId: number, quantity: number): void {
    this.cartService.setQuantity(productId, quantity);
  }

  onRemove(productId: number): void {
    this.cartService.remove(productId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  checkout(): void {
    this.cartService.clear();
    void this.router.navigate(['/catalog']);
  }
}
