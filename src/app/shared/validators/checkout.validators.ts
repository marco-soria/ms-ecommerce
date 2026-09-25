import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { CartService } from '@features/cart/data-access/cart.service';
import { ProductService } from '@features/catalog/data-access/product.service';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

/** Payment group: amountPaid must equal the cart total. */
export function paymentAmountMatchesTotal(getTotal: () => number): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const raw = group.get('amountPaid')?.value;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const amount = Number(raw);
    const total = Number(getTotal().toFixed(2));

    if (Number.isNaN(amount)) {
      return { amountInvalid: true };
    }

    return Math.abs(amount - total) < 0.01 ? null : { amountMismatch: true };
  };
}

/**
 * Async validator: re-check live stock in Supabase before confirming the order.
 * Uses debounce to avoid flooding the API.
 */
export function stockAvailabilityValidator(
  cart: CartService,
  products: ProductService,
): AsyncValidatorFn {
  return (): Observable<ValidationErrors | null> => {
    const items = cart.items();

    if (items.length === 0) {
      return of(null);
    }

    const ids = items.map((item) => item.product.id);

    return timer(300).pipe(
      switchMap(() => products.getByIds(ids)),
      map((freshProducts) => {
        for (const item of items) {
          const live = freshProducts.find((product) => product.id === item.product.id);

          if (!live) {
            return {
              insufficientStock: {
                productId: item.product.id,
                name: item.product.name,
                reason: 'missing',
              },
            };
          }

          if (item.quantity > live.stock) {
            return {
              insufficientStock: {
                productId: item.product.id,
                name: live.name,
                available: live.stock,
                requested: item.quantity,
              },
            };
          }
        }

        return null;
      }),
      catchError(() => of({ stockCheckFailed: true })),
    );
  };
}
