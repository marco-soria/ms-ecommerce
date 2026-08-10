import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { IProduct } from '../models/product.model';
import { StockLabelPipe } from '../pipes/stock-label-pipe';

@Component({
  selector: 'app-product-details',
  imports: [CurrencyPipe, StockLabelPipe],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  readonly product = input.required<IProduct>();
  readonly compact = input(false);
}
