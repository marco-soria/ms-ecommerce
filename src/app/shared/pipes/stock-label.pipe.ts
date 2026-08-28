import { Pipe, PipeTransform } from '@angular/core';

export type StockLevel = 'out' | 'low' | 'ok';

@Pipe({
  name: 'stockLabel',
})
export class StockLabelPipe implements PipeTransform {
  transform(stock: number): string {
    if (stock <= 0) {
      return 'Out of stock';
    }
    if (stock < 10) {
      return `Low stock (${stock})`;
    }
    return `In stock (${stock})`;
  }
}

@Pipe({
  name: 'stockLevel',
})
export class StockLevelPipe implements PipeTransform {
  transform(stock: number): StockLevel {
    if (stock <= 0) {
      return 'out';
    }
    if (stock < 10) {
      return 'low';
    }
    return 'ok';
  }
}
