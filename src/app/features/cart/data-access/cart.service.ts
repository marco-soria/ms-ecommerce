import { Injectable, computed, effect, signal } from '@angular/core';
import { IProduct } from '@shared/models/product.model';
import { ICartItem } from './cart-item.model';

const CART_STORAGE_KEY = 'ms-ecommerce-cart';

export interface CartUiState {
  loading: boolean;
  error: string | null;
  filter: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly itemsSignal = signal<ICartItem[]>([]);
  private readonly uiState = signal<CartUiState>({
    loading: false,
    error: null,
    filter: '',
  });

  readonly items = this.itemsSignal.asReadonly();
  readonly ui = this.uiState.asReadonly();

  readonly totalItems = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0),
  );

  /** Cascaded pricing: subtotal → discount → total */
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
  );

  readonly discount = computed(() => {
    const base = this.subtotal();
    return base > 200 ? base * 0.1 : 0;
  });

  readonly total = computed(() => this.subtotal() - this.discount());

  /** @deprecated Prefer `total` (includes discount). Kept for existing templates. */
  readonly totalPrice = computed(() => this.total());

  constructor() {
    this.restoreFromStorage();

    effect(() => {
      const items = this.itemsSignal();
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    });
  }

  add(product: IProduct): void {
    this.addToCart(product);
  }

  addToCart(product: IProduct): void {
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
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...items, { product, quantity: 1 }];
    });
  }

  remove(productId: number): void {
    this.removeFromCart(productId);
  }

  removeFromCart(productId: number): void {
    this.itemsSignal.update((items) =>
      items.filter((item) => item.product.id !== productId),
    );
  }

  updateQuantity(productId: number, quantity: number): void {
    this.setQuantity(productId, quantity);
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

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as ICartItem[];
      if (!Array.isArray(parsed)) {
        return;
      }

      const valid = parsed.filter(
        (item) =>
          item?.product &&
          typeof item.product.id === 'number' &&
          typeof item.quantity === 'number',
      );

      this.itemsSignal.set(valid);
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }
}
