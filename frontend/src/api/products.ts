import { api } from './api-client';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types/products';

export const productsApi = {
  list(): Promise<Product[]> {
    return api.get<Product[]>('/products');
  },

  getById(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  },

  create(payload: CreateProductRequest): Promise<Product> {
    return api.post<Product>('/products', payload);
  },

  update(id: string, payload: UpdateProductRequest): Promise<Product> {
    return api.patch<Product>(`/products/${id}`, payload);
  },
};
