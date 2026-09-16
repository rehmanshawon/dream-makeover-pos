import { api } from './api-client';
import type {
  Category,
  CategoryNode,
  CategoryKind,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../types/categories';

export const categoriesApi = {
  list(kind?: CategoryKind): Promise<Category[]> {
    const query = kind ? `?kind=${kind}` : '';
    return api.get<Category[]>(`/categories${query}`);
  },

  tree(kind?: CategoryKind): Promise<CategoryNode[]> {
    const query = kind ? `?kind=${kind}` : '';
    return api.get<CategoryNode[]>(`/categories/tree${query}`);
  },

  getById(id: string): Promise<Category> {
    return api.get<Category>(`/categories/${id}`);
  },

  create(payload: CreateCategoryRequest): Promise<Category> {
    return api.post<Category>('/categories', payload);
  },

  update(id: string, payload: UpdateCategoryRequest): Promise<Category> {
    return api.patch<Category>(`/categories/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`/categories/${id}`);
  },
};
