import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { ICartItem } from '@features/cart/data-access/cart-item.model';
import { Observable, map } from 'rxjs';
import { DatosEnvio, Venta } from './venta.model';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.supabase.url;

  crearCheckout(
    items: ICartItem[],
    envio: DatosEnvio,
    captchaToken: string,
  ): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(
      `${this.base}/functions/v1/crear-checkout`,
      {
        items: items.map((item) => ({
          product_id: item.product.id,
          cantidad: item.quantity,
        })),
        envio,
        captchaToken,
      },
    );
  }

  obtenerPorSesion(sessionId: string): Observable<Venta | undefined> {
    return this.http
      .get<Venta[]>(
        `${this.base}/rest/v1/ventas?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=*,detalle_venta(*)`,
      )
      .pipe(map((ventas) => ventas[0]));
  }

  misVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(
      `${this.base}/rest/v1/ventas?select=*,detalle_venta(*)&order=created_at.desc`,
    );
  }
}
