import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { environment } from '@environments/environment';
import {
  IProduct,
  ProductCreate,
  ProductUpdate,
} from '@shared/models/product.model';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.supabase.url}/rest/v1/${environment.supabase.productsTable}`;
  private readonly selectColumns = 'id,name,price,image,stock';

  private readonly productsResource = httpResource<IProduct[]>(
    () => ({
      url: this.resourceUrl,
      params: {
        select: this.selectColumns,
        order: 'id.asc',
      },
    }),
    {
      defaultValue: [],
      parse: (value) => this.normalizeProducts(value),
    },
  );

  readonly products = computed(() => this.productsResource.value() ?? []);
  readonly loading = computed(() => this.productsResource.isLoading());
  readonly error = computed(() =>
    this.productsResource.error() ? 'Could not load the catalog.' : null,
  );

  listar(): Observable<IProduct[]> {
    const params = new HttpParams()
      .set('select', this.selectColumns)
      .set('order', 'id.asc');

    return this.http.get<IProduct[]>(this.resourceUrl, { params }).pipe(
      map((products) => this.normalizeProducts(products)),
      catchError((error: unknown) => {
        console.error('Could not load the catalog', error);
        return throwError(() => new Error('Could not load the catalog.'));
      }),
    );
  }

  crear(producto: ProductCreate | Partial<IProduct>): Observable<IProduct> {
    return this.http.post<IProduct[]>(this.resourceUrl, producto).pipe(
      map((rows) => this.firstOrThrow(rows, 'create')),
      catchError((error: unknown) => {
        console.error('Could not create the product', error);
        return throwError(() => new Error('Could not create the product.'));
      }),
    );
  }

  actualizar(id: number, cambios: ProductUpdate): Observable<IProduct> {
    const params = new HttpParams().set('id', `eq.${id}`);

    return this.http.patch<IProduct[]>(this.resourceUrl, cambios, { params }).pipe(
      map((rows) => this.firstOrThrow(rows, 'update')),
      catchError((error: unknown) => {
        console.error('Could not update the product', error);
        return throwError(() => new Error('Could not update the product.'));
      }),
    );
  }

  eliminar(id: number): Observable<void> {
    const params = new HttpParams().set('id', `eq.${id}`);

    return this.http.delete<void>(this.resourceUrl, { params }).pipe(
      catchError((error: unknown) => {
        console.error('Could not delete the product', error);
        return throwError(() => new Error('Could not delete the product.'));
      }),
    );
  }

  recargar(): void {
    this.productsResource.reload();
  }

  private normalizeProducts(value: unknown): IProduct[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => ({
      id: Number(item.id),
      name: String(item.name),
      price: Number(item.price),
      image: String(item.image),
      stock: Number(item.stock),
    }));
  }

  private firstOrThrow(rows: IProduct[], operation: string): IProduct {
    const product = this.normalizeProducts(rows)[0];

    if (!product) {
      throw new Error(`Supabase ${operation} did not return a product.`);
    }

    return product;
  }
}
