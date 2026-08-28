import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductAdmin } from './product-admin';

describe('ProductAdmin', () => {
  let component: ProductAdmin;
  let fixture: ComponentFixture<ProductAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
