import { IProduct } from '@shared/models/product.model';

export interface ICartItem {
  product: IProduct;
  quantity: number;
}
