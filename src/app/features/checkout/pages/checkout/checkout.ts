import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/data-access/cart.service';
import { ProductService } from '@features/catalog/data-access/product.service';
import {
  paymentAmountMatchesTotal,
  stockAvailabilityValidator,
} from '@shared/validators/checkout.validators';

@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly products = inject(ProductService);
  readonly auth = inject(AuthService);
  readonly cartService = inject(CartService);

  readonly paymentMethods = [
    { value: 'credit', label: 'Credit card' },
    { value: 'debit', label: 'Debit card' },
    { value: 'paypal', label: 'PayPal' },
  ] as const;

  readonly checkoutForm = this.fb.nonNullable.group(
    {
      shipping: this.fb.nonNullable.group({
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        address: ['', [Validators.required, Validators.minLength(5)]],
        useAlternativeAddress: [false],
        alternativeAddress: [
          { value: '', disabled: true },
          [Validators.required, Validators.minLength(5)],
        ],
      }),
      payment: this.fb.nonNullable.group(
        {
          method: ['credit' as const, Validators.required],
          cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
          cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
          amountPaid: [
            this.cartService.total(),
            [Validators.required, Validators.min(0.01)],
          ],
        },
        {
          validators: paymentAmountMatchesTotal(() => this.cartService.total()),
        },
      ),
    },
    {
      asyncValidators: [
        stockAvailabilityValidator(this.cartService, this.products),
      ],
      updateOn: 'change',
    },
  );

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.checkoutForm.controls.shipping.patchValue({
        fullName: user.name,
      });
    }

    this.checkoutForm.controls.shipping.controls.useAlternativeAddress.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((use) => {
        const field =
          this.checkoutForm.controls.shipping.controls.alternativeAddress;
        if (use) {
          field.enable();
        } else {
          field.disable();
          field.reset('');
        }
      });
  }

  get shipping() {
    return this.checkoutForm.controls.shipping;
  }

  get payment() {
    return this.checkoutForm.controls.payment;
  }

  get fullName() {
    return this.shipping.controls.fullName;
  }

  get address() {
    return this.shipping.controls.address;
  }

  get useAlternativeAddress() {
    return this.shipping.controls.useAlternativeAddress;
  }

  get alternativeAddress() {
    return this.shipping.controls.alternativeAddress;
  }

  get method() {
    return this.payment.controls.method;
  }

  get cardNumber() {
    return this.payment.controls.cardNumber;
  }

  get cvv() {
    return this.payment.controls.cvv;
  }

  get amountPaid() {
    return this.payment.controls.amountPaid;
  }

  get isStockPending(): boolean {
    return this.checkoutForm.status === 'PENDING';
  }

  get stockError(): { name?: string; available?: number } | null {
    const err = this.checkoutForm.errors?.['insufficientStock'] as
      | { name?: string; available?: number }
      | undefined;
    return err ?? null;
  }

  get stockCheckFailed(): boolean {
    return !!this.checkoutForm.errors?.['stockCheckFailed'];
  }

  onSubmit(): void {
    if (this.checkoutForm.pending) {
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    console.log(this.checkoutForm.getRawValue());
    this.cartService.clear();
    void this.router.navigate(['/catalog']);
  }
}
