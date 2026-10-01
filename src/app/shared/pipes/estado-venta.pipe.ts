import { Pipe, PipeTransform } from '@angular/core';
import { EstadoVenta } from '@features/checkout/data-access/venta.model';

@Pipe({
  name: 'estadoVenta',
})
export class EstadoVentaPipe implements PipeTransform {
  transform(estado: EstadoVenta | string | null | undefined): string {
    switch (estado) {
      case 'pendiente':
        return 'Pending';
      case 'pagada':
        return 'Paid';
      case 'cancelada':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }
}
