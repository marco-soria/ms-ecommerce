import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  {
    path: 'catalog',
    loadComponent: () =>
      import('@features/catalog/pages/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('@features/catalog/pages/product-detail/product-detail').then(
        (m) => m.ProductDetail,
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('@features/cart/pages/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/checkout/pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'pago/exito',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/checkout/pages/pago-exito/pago-exito').then((m) => m.PagoExito),
  },
  {
    path: 'pago/cancelado',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/checkout/pages/pago-cancelado/pago-cancelado').then(
        (m) => m.PagoCancelado,
      ),
  },
  {
    path: 'mis-compras',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/checkout/pages/mis-compras/mis-compras').then((m) => m.MisCompras),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('@features/catalog/pages/product-admin/product-admin').then(
        (m) => m.ProductAdmin,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/pages/register/register').then((m) => m.Register),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@features/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
