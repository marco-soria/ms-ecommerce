import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Checkout } from './checkout';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
