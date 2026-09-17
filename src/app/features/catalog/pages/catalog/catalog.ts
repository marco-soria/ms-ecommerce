import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '@features/cart/data-access/cart.service';
import { ProductService } from '@features/catalog/data-access/product.service';
import { IProduct } from '@shared/models/product.model';
import { ProductDetails } from '@shared/ui/product-details/product-details';
import { SkeletonCard } from '@shared/ui/skeleton-card/skeleton-card';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';

@Component({
  selector: 'app-catalog',
  imports: [ProductDetails, RouterLink, SkeletonCard],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly cartService = inject(CartService);

  readonly pageSize = 6;
  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly favorites = signal<IProduct[]>([]);

  private readonly searchTerm$ = toObservable(this.searchTerm).pipe(
    debounceTime(300),
    distinctUntilChanged(),
  );

  private readonly currentPage$ = toObservable(this.currentPage);

  /** Products from the reactive search + pagination stream. */
  readonly products = toSignal(
    combineLatest([this.searchTerm$, this.currentPage$]).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(([term, page]) =>
        this.productService.search(term, page, this.pageSize).pipe(
          tap(() => this.loading.set(false)),
          catchError(() => {
            this.loading.set(false);
            this.error.set('Could not load the catalog.');
            return of([] as IProduct[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as IProduct[] },
  );

  readonly favoritesCount = computed(() => this.favorites().length);
  readonly hasPrevPage = computed(() => this.currentPage() > 1);
  readonly hasNextPage = computed(() => this.products().length >= this.pageSize);
  readonly skeletonItems = Array.from({ length: this.pageSize }, (_, i) => i);

  /** Used so the page-reset effect does not wipe URL `page` on first load. */
  private lastSearchTerm = '';

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const term = params.get('term') ?? '';
    const page = Number(params.get('page') ?? '1');

    this.searchTerm.set(term);
    this.currentPage.set(Number.isFinite(page) && page > 0 ? page : 1);
    this.lastSearchTerm = term;

    // Reset to page 1 whenever the search text changes (after hydration).
    effect(() => {
      const term = this.searchTerm();
      untracked(() => {
        if (term === this.lastSearchTerm) {
          return;
        }
        this.lastSearchTerm = term;
        if (this.currentPage() !== 1) {
          this.currentPage.set(1);
        }
      });
    });

    // Keep the URL in sync with search + page.
    effect(() => {
      const term = this.searchTerm().trim();
      const page = this.currentPage();

      untracked(() => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            term: term || null,
            page: page > 1 ? page : null,
          },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevPage()) {
      this.currentPage.update((page) => Math.max(1, page - 1));
    }
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
