import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '@features/cart/data-access/cart.service';
import { Venta } from '@features/checkout/data-access/venta.model';
import { VentaService } from '@features/checkout/data-access/venta.service';
import { Observable, of } from 'rxjs';

import { PagoExito } from './pago-exito';

/**
 * App zoneless: no usamos fakeAsync/tick de Angular (requieren zone.js).
 * Simulamos el polling con los fake timers de Vitest (vi.advanceTimersByTimeAsync).
 */
describe('PagoExito', () => {
  let fixture: ComponentFixture<PagoExito>;
  let component: PagoExito;
  let cartService: CartService;
  let appRef: ApplicationRef;
  let obtenerPorSesionCalls: number;
  let responses: Venta[];

  const sessionId = 'cs_test_abc123';

  const ventaPendiente: Venta = {
    id: 'venta-1',
    user_id: 'user-1',
    estado: 'pendiente',
    total: 100,
    nombre_completo: 'user01',
    direccion: 'Jr parra del riego 810',
    stripe_session_id: sessionId,
    created_at: '2026-10-01T21:00:00.000Z',
    detalle_venta: [
      {
        id: 1,
        venta_id: 'venta-1',
        product_id: 10,
        cantidad: 1,
        precio_unitario: 100,
      },
    ],
  };

  const ventaPagada: Venta = {
    ...ventaPendiente,
    estado: 'pagada',
  };

  async function flushUi(): Promise<void> {
    appRef.tick();
    fixture.detectChanges();
    await Promise.resolve();
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    obtenerPorSesionCalls = 0;
    responses = [ventaPendiente, ventaPagada];

    const ventaServiceStub: Pick<VentaService, 'obtenerPorSesion'> = {
      obtenerPorSesion: (_id: string): Observable<Venta | undefined> => {
        const next =
          responses[Math.min(obtenerPorSesionCalls, responses.length - 1)];
        obtenerPorSesionCalls += 1;
        return of(next);
      },
    };

    await TestBed.configureTestingModule({
      imports: [PagoExito],
      providers: [
        provideRouter([]),
        CartService,
        { provide: VentaService, useValue: ventaServiceStub },
      ],
    }).compileComponents();

    appRef = TestBed.inject(ApplicationRef);
    cartService = TestBed.inject(CartService);
    cartService.clear();
    cartService.addToCart({
      id: 10,
      name: 'Test Product',
      price: 100,
      image: 'https://example.com/p.jpg',
      stock: 5,
    });

    fixture = TestBed.createComponent(PagoExito);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('session_id', sessionId);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should create', async () => {
    await flushUi();
    expect(component).toBeTruthy();
  });

  it('should poll until venta becomes pagada, clear the cart, and stop polling (takeWhile)', async () => {
    expect(cartService.totalItems()).toBe(1);

    fixture.detectChanges();

    // timer(0, 2000): primera emisión inmediata → pendiente
    await vi.advanceTimersByTimeAsync(0);
    await flushUi();

    expect(obtenerPorSesionCalls).toBe(1);
    expect(component.venta()?.estado).toBe('pendiente');
    expect(component.isPending()).toBe(true);
    expect(component.isPaid()).toBe(false);
    expect(cartService.totalItems()).toBe(1);

    // segundo poll a los 2s → pagada; takeWhile(inclusive) emite y completa
    await vi.advanceTimersByTimeAsync(2000);
    await flushUi();

    expect(obtenerPorSesionCalls).toBe(2);
    expect(component.venta()?.estado).toBe('pagada');
    expect(component.isPaid()).toBe(true);
    expect(component.isPending()).toBe(false);
    expect(cartService.totalItems()).toBe(0);

    // más tiempo NO debe seguir haciendo polling (takeWhile cerró el stream)
    await vi.advanceTimersByTimeAsync(10_000);
    await flushUi();
    expect(obtenerPorSesionCalls).toBe(2);
  });

  it('should keep polling while estado remains pendiente', async () => {
    responses = [ventaPendiente, ventaPendiente, ventaPendiente];

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    await flushUi();
    expect(obtenerPorSesionCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(2000);
    await flushUi();
    expect(obtenerPorSesionCalls).toBe(2);

    await vi.advanceTimersByTimeAsync(2000);
    await flushUi();
    expect(obtenerPorSesionCalls).toBe(3);
    expect(component.isPending()).toBe(true);
    expect(cartService.totalItems()).toBe(1);
  });
});
