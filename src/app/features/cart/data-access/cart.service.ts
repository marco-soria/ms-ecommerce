import { Injectable, computed, signal } from '@angular/core';
import { ICartItem } from '../models/cart-item.model';
import { IProduct } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly itemsSignal = signal<ICartItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();
  readonly totalItems = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly totalPrice = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );

  add(product: IProduct): void {
    if (product.stock <= 0) {
      return;
    }

    this.itemsSignal.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) {
          return items;
        }

        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...items, { product, quantity: 1 }];
    });
  }

  remove(productId: number): void {
    this.itemsSignal.update((items) => items.filter((item) => item.product.id !== productId));
  }

  increase(productId: number): void {
    this.itemsSignal.update((items) =>
      items.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        if (item.quantity >= item.product.stock) {
          return item;
        }
        return { ...item, quantity: item.quantity + 1 };
      }),
    );
  }

  decrease(productId: number): void {
    this.itemsSignal.update((items) =>
      items.flatMap((item) => {
        if (item.product.id !== productId) {
          return [item];
        }
        if (item.quantity <= 1) {
          return [];
        }
        return [{ ...item, quantity: item.quantity - 1 }];
      }),
    );
  }

  setQuantity(productId: number, quantity: number): void {
    this.itemsSignal.update((items) =>
      items.flatMap((item) => {
        if (item.product.id !== productId) {
          return [item];
        }

        const nextQuantity = Math.min(Math.max(quantity, 0), item.product.stock);

        if (nextQuantity <= 0) {
          return [];
        }

        return [{ ...item, quantity: nextQuantity }];
      }),
    );
  }

  quantityOf(productId: number): number {
    return this.itemsSignal().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  clear(): void {
    this.itemsSignal.set([]);
  }
}
