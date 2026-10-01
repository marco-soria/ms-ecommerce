import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartService } from '@features/cart/data-access/cart.service';
import { VentaService } from '@features/checkout/data-access/venta.service';
import { EstadoVentaPipe } from '@shared/pipes/estado-venta.pipe';
import { switchMap, takeWhile, timer } from 'rxjs';

@Component({
  selector: 'app-pago-exito',
  imports: [RouterLink, CurrencyPipe, DatePipe, EstadoVentaPipe],
  templateUrl: './pago-exito.html',
})
export class PagoExito {
  private readonly ventaService = inject(VentaService);
  private readonly cartService = inject(CartService);
  private readonly cartCleared = signal(false);

  /** Bound from ?session_id= via withComponentInputBinding */
  readonly sessionId = input.required<string>({ alias: 'session_id' });

  readonly waitedTooLong = signal(false);

  readonly venta = toSignal(
    toObservable(this.sessionId).pipe(
      switchMap((id) =>
        timer(0, 2000).pipe(
          switchMap(() => this.ventaService.obtenerPorSesion(id)),
          takeWhile((v) => v?.estado === 'pendiente', true),
        ),
      ),
    ),
  );

  readonly isPending = computed(() => {
    const v = this.venta();
    return !v || v.estado === 'pendiente';
  });

  readonly isPaid = computed(() => this.venta()?.estado === 'pagada');

  constructor() {
    effect(() => {
      if (this.isPaid() && !this.cartCleared()) {
        this.cartService.clear();
        this.cartCleared.set(true);
      }
    });

    // Reto guía: ayuda si tras ~30s sigue pendiente
    effect(() => {
      if (!this.isPending()) {
        return;
      }
      const handle = setTimeout(() => this.waitedTooLong.set(true), 30_000);
      return () => clearTimeout(handle);
    });
  }
}
