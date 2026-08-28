import { Component, computed, inject, output, signal } from '@angular/core';
import { CartService } from '@features/cart/data-access/cart.service';
import { ProductService } from '@features/catalog/data-access/product.service';
import { IProduct } from '@shared/models/product.model';
import { ProductDetails } from '@shared/ui/product-details/product-details';

@Component({
  selector: 'app-catalog',
  imports: [ProductDetails],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  private readonly productService = inject(ProductService);
  readonly cartService = inject(CartService);

  readonly products = signal<IProduct[]>([]);
  readonly favorites = signal<IProduct[]>([]);
  readonly searchText = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly favoritesCountChange = output<number>();

  readonly filteredProducts = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const list = this.products();

    if (!query) {
      return list;
    }

    return list.filter((product) =>
      product.name.toLowerCase().includes(query),
    );
  });

  readonly favoritesCount = computed(() => this.favorites().length);

  constructor() {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the catalog.');
        this.loading.set(false);
      },
    });
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  isFavorite(product: IProduct): boolean {
    return this.favorites().some((item) => item.id === product.id);
  }

  onToggleFavorite(product: IProduct): void {
    this.favorites.update((items) => {
      const exists = items.some((item) => item.id === product.id);
      return exists
        ? items.filter((item) => item.id !== product.id)
        : [...items, product];
    });
    this.favoritesCountChange.emit(this.favoritesCount());
  }

  quantityOf(product: IProduct): number {
    return this.cartService.quantityOf(product.id);
  }

  increase(product: IProduct): void {
    this.cartService.add(product);
  }

  decrease(product: IProduct): void {
    this.cartService.decrease(product.id);
  }

  canIncrease(product: IProduct): boolean {
    return (
      product.stock > 0 &&
      this.cartService.quantityOf(product.id) < product.stock
    );
  }

  canDecrease(product: IProduct): boolean {
    return this.cartService.quantityOf(product.id) > 0;
  }
}
