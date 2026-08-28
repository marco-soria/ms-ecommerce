import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ProductService } from '@features/catalog/data-access/product.service';
import { IProduct } from '@shared/models/product.model';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'app-product-admin',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './product-admin.html',
  styleUrl: './product-admin.css',
})
export class ProductAdmin {
  readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  readonly name = signal('');
  readonly price = signal(0);
  readonly image = signal('');
  readonly stock = signal(0);
  readonly editingId = signal<number | null>(null);
  readonly formError = signal<string | null>(null);
  readonly searchText = signal('');

  readonly isEditing = computed(() => this.editingId() !== null);

  readonly searchQuery = toSignal(
    toObservable(this.searchText).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map((value) => value.trim().toLowerCase()),
    ),
    { initialValue: '' },
  );

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery();
    const products = this.productService.products();

    if (!query) {
      return products;
    }

    return products.filter((product) => product.name.toLowerCase().includes(query));
  });

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  guardar(): void {
    this.formError.set(null);

    const producto = {
      name: this.name().trim(),
      price: Number(this.price()),
      image: this.image().trim(),
      stock: Number(this.stock()),
    };

    if (
      !producto.name ||
      !producto.image ||
      Number.isNaN(producto.price) ||
      Number.isNaN(producto.stock)
    ) {
      this.formError.set('Please fill in name, price, image and stock.');
      return;
    }

    const editingId = this.editingId();
    const request$ =
      editingId === null
        ? this.productService.crear(producto)
        : this.productService.actualizar(editingId, producto);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.productService.recargar();
        this.resetForm();
      },
      error: (error: Error) => {
        this.formError.set(error.message);
      },
    });
  }

  editar(product: IProduct): void {
    this.editingId.set(product.id);
    this.name.set(product.name);
    this.price.set(product.price);
    this.image.set(product.image);
    this.stock.set(product.stock);
    this.formError.set(null);
  }

  eliminar(id: number): void {
    this.formError.set(null);

    this.productService
      .eliminar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.editingId() === id) {
            this.resetForm();
          }
          this.productService.recargar();
        },
        error: (error: Error) => {
          this.formError.set(error.message);
        },
      });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.price.set(0);
    this.image.set('');
    this.stock.set(0);
    this.formError.set(null);
  }
}
