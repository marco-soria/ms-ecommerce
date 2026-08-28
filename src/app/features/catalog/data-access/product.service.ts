import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IProduct } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);

  getProducts(): Observable<IProduct[]> {
    return this.http.get<IProduct[]>('/products.json');
  }
}
