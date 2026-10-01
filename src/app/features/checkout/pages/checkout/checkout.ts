import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/data-access/cart.service';
import { VentaService } from '@features/checkout/data-access/venta.service';
import { CaptchaComponent } from '@shared/ui/captcha/captcha';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, CaptchaComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private readonly fb = inject(FormBuilder);
  private readonly ventaService = inject(VentaService);
  readonly auth = inject(AuthService);
  readonly cartService = inject(CartService);

  readonly captchaToken = signal('');
  readonly procesando = signal(false);
  readonly formError = signal<string | null>(null);
  readonly captchaError = signal(false);

  readonly checkoutForm = this.fb.nonNullable.group({
    envio: this.fb.nonNullable.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(2)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
    }),
  });

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.checkoutForm.controls.envio.patchValue({
        nombreCompleto: user.name,
      });
    }
  }

  get envio() {
    return this.checkoutForm.controls.envio;
  }

  get nombreCompleto() {
    return this.envio.controls.nombreCompleto;
  }

  get direccion() {
    return this.envio.controls.direccion;
  }

  onCaptchaToken(token: string): void {
    this.captchaToken.set(token);
    this.captchaError.set(false);
  }

  onCaptchaError(): void {
    this.captchaToken.set('');
    this.captchaError.set(true);
  }

  pagar(): void {
    if (this.checkoutForm.invalid || !this.captchaToken() || this.procesando()) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    this.formError.set(null);

    this.ventaService
      .crearCheckout(
        this.cartService.items(),
        this.checkoutForm.getRawValue().envio,
        this.captchaToken(),
      )
      .subscribe({
        next: ({ url }) => {
          window.location.href = url;
        },
        error: (error: unknown) => {
          this.procesando.set(false);
          this.formError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { error?: string } | null;
      if (body?.error) {
        return body.error;
      }
    }
    return 'Could not start checkout. Please try again.';
  }
}
