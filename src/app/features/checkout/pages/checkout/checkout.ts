import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/data-access/cart.service';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cartService = inject(CartService);

  readonly checkoutForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
    expiryDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
  });

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.checkoutForm.patchValue({
        name: user.name,
        email: user.email,
      });
    }
  }

  get name() {
    return this.checkoutForm.controls.name;
  }

  get email() {
    return this.checkoutForm.controls.email;
  }

  get address() {
    return this.checkoutForm.controls.address;
  }

  get cardNumber() {
    return this.checkoutForm.controls.cardNumber;
  }

  get expiryDate() {
    return this.checkoutForm.controls.expiryDate;
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    console.log(this.checkoutForm.getRawValue());
    this.cartService.clear();
    void this.router.navigate(['/catalog']);
  }
}
