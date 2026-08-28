export interface IProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  stock: number;
}

export type ProductCreate = Omit<IProduct, 'id'>;
export type ProductUpdate = Partial<Omit<IProduct, 'id'>>;
