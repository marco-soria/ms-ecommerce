import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { ICartItem } from '@features/cart/data-access/cart-item.model';
import { DatosEnvio, Venta } from './venta.model';
import { VentaService } from './venta.service';

describe('VentaService', () => {
  let service: VentaService;
  let httpTesting: HttpTestingController;
  const base = environment.supabase.url;

  const cartItems: ICartItem[] = [
    {
      product: {
        id: 1,
        name: 'Ultra Laptop 14"',
        price: 3499,
        image: 'https://example.com/laptop.jpg',
        stock: 5,
      },
      quantity: 1,
    },
    {
      product: {
        id: 2,
        name: 'Wireless Mouse',
        price: 89,
        image: 'https://example.com/mouse.jpg',
        stock: 10,
      },
      quantity: 2,
    },
  ];

  const envio: DatosEnvio = {
    nombreCompleto: 'user01',
    direccion: 'Jr parra del riego 810',
  };

  const mockVenta: Venta = {
    id: 'venta-uuid-1',
    user_id: 'user-uuid-1',
    estado: 'pendiente',
    total: 3677,
    nombre_completo: 'user01',
    direccion: 'Jr parra del riego 810',
    stripe_session_id: 'cs_test_123',
    created_at: '2026-10-01T21:00:00.000Z',
    detalle_venta: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(VentaService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('crearCheckout should POST ids and quantities (never prices) and return url', () => {
    let responseUrl: string | undefined;

    service.crearCheckout(cartItems, envio, 'captcha-token-ok').subscribe((res) => {
      responseUrl = res.url;
    });

    const req = httpTesting.expectOne(`${base}/functions/v1/crear-checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      items: [
        { product_id: 1, cantidad: 1 },
        { product_id: 2, cantidad: 2 },
      ],
      envio,
      captchaToken: 'captcha-token-ok',
    });
    expect(JSON.stringify(req.request.body)).not.toContain('3499');
    expect(JSON.stringify(req.request.body)).not.toContain('price');

    req.flush({ url: 'https://checkout.stripe.com/c/pay/cs_test_123' });
    expect(responseUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
  });

  it('crearCheckout should propagate HTTP 400 errors', () => {
    let status: number | undefined;
    let message: string | undefined;

    service.crearCheckout(cartItems, envio, 'bad-token').subscribe({
      next: () => {
        throw new Error('expected error');
      },
      error: (err: { status: number; error: { error: string } }) => {
        status = err.status;
        message = err.error.error;
      },
    });

    const req = httpTesting.expectOne(`${base}/functions/v1/crear-checkout`);
    req.flush(
      { error: 'Captcha inválido' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(status).toBe(400);
    expect(message).toBe('Captcha inválido');
  });

  it('crearCheckout should propagate HTTP 500 errors', () => {
    let status: number | undefined;

    service.crearCheckout(cartItems, envio, 'captcha-token-ok').subscribe({
      next: () => {
        throw new Error('expected error');
      },
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    const req = httpTesting.expectOne(`${base}/functions/v1/crear-checkout`);
    req.flush(
      { error: 'Error interno al crear el checkout' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(status).toBe(500);
  });

  it('obtenerPorSesion should GET by stripe_session_id and return the first venta', () => {
    let result: Venta | undefined;

    service.obtenerPorSesion('cs_test_123').subscribe((venta) => {
      result = venta;
    });

    const req = httpTesting.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url.includes('/rest/v1/ventas') &&
        request.url.includes('stripe_session_id=eq.cs_test_123') &&
        request.url.includes('select=*,detalle_venta(*)'),
    );

    req.flush([mockVenta]);
    expect(result).toEqual(mockVenta);
  });

  it('obtenerPorSesion should return undefined when the list is empty', () => {
    let result: Venta | undefined | null = null;

    service.obtenerPorSesion('cs_missing').subscribe((venta) => {
      result = venta;
    });

    const req = httpTesting.expectOne((request) =>
      request.url.includes('stripe_session_id=eq.cs_missing'),
    );
    req.flush([]);
    expect(result).toBeUndefined();
  });

  it('obtenerPorSesion should propagate HTTP 500 errors', () => {
    let status: number | undefined;

    service.obtenerPorSesion('cs_test_123').subscribe({
      next: () => {
        throw new Error('expected error');
      },
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    const req = httpTesting.expectOne((request) =>
      request.url.includes('/rest/v1/ventas'),
    );
    req.flush(
      { message: 'db error' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(status).toBe(500);
  });

  it('misVentas should GET ordered ventas with detalle', () => {
    let result: Venta[] | undefined;

    service.misVentas().subscribe((ventas) => {
      result = ventas;
    });

    const req = httpTesting.expectOne(
      `${base}/rest/v1/ventas?select=*,detalle_venta(*)&order=created_at.desc`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockVenta]);
    expect(result).toEqual([mockVenta]);
  });

  it('misVentas should propagate HTTP 400 errors', () => {
    let status: number | undefined;

    service.misVentas().subscribe({
      next: () => {
        throw new Error('expected error');
      },
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    const req = httpTesting.expectOne((request) =>
      request.url.includes('/rest/v1/ventas'),
    );
    req.flush(
      { message: 'bad request' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(status).toBe(400);
  });
});
