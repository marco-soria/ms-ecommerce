import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { VentaService } from '@features/checkout/data-access/venta.service';
import { EstadoVentaPipe } from '@shared/pipes/estado-venta.pipe';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-mis-compras',
  imports: [RouterLink, CurrencyPipe, DatePipe, EstadoVentaPipe],
  templateUrl: './mis-compras.html',
})
export class MisCompras {
  private readonly ventaService = inject(VentaService);

  readonly error = signal<string | null>(null);
  readonly expandedIds = signal<Set<string>>(new Set());

  readonly ventas = toSignal(
    this.ventaService.misVentas().pipe(
      catchError(() => {
        this.error.set('Could not load your orders.');
        return of([]);
      }),
    ),
    { initialValue: [] },
  );

  toggle(id: string): void {
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'pagada':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'cancelada':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    }
  }
}
