import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { IProduct } from '@shared/models/product.model';

import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpTesting: HttpTestingController;
  const resourceUrl = `${environment.supabase.url}/rest/v1/${environment.supabase.productsTable}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProductService);
    httpTesting.match(() => true).forEach((request) => request.flush([]));
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush([]));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list products from Supabase', () => {
    const mockProducts: IProduct[] = [
      {
        id: 1,
        name: 'Laptop',
        price: 1000,
        image: 'https://example.com/laptop.jpg',
        stock: 4,
      },
    ];

    service.listar().subscribe((products) => {
      expect(products).toEqual(mockProducts);
    });

    const req = httpTesting.expectOne(
      (request) =>
        request.url.startsWith(resourceUrl) &&
        request.method === 'GET' &&
        request.params.get('select') === 'id,name,price,image,stock',
    );

    req.flush(mockProducts);
  });
});
