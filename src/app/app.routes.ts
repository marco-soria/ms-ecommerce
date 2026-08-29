import { Routes } from '@angular/router';

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
