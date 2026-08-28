import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IProduct } from '@shared/models/product.model';
import { StockLabelPipe, StockLevelPipe } from '@shared/pipes/stock-label.pipe';


@Component({
  selector: 'app-product-details',
  imports: [CurrencyPipe, StockLabelPipe, StockLevelPipe],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  readonly product = input.required<IProduct>();
  readonly compact = input(false);
  readonly isFavorite = input(false);
  readonly showFavorite = input(true);
  readonly toggleFavorite = output<IProduct>();

  onToggleFavorite(event: Event): void {
    event.stopPropagation();
    this.toggleFavorite.emit(this.product());
  }
}
