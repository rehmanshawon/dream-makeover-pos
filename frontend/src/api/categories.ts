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

  create(payload: CreateCategoryRequest, iconFile?: File): Promise<Category> {
    if (iconFile) {
      const body = new FormData();
      body.set('name', payload.name);
      body.set('kind', payload.kind);
      body.set('displayOrder', String(payload.displayOrder ?? 0));
      if (payload.parentId) body.set('parentId', payload.parentId);
      if (payload.active !== undefined) body.set('active', String(payload.active));
      body.set('icon', iconFile);
      return api.post<Category>('/categories', body, { formData: true });
    }
    return api.post<Category>('/categories', payload);
  },

  update(id: string, payload: UpdateCategoryRequest): Promise<Category> {
    return api.patch<Category>(`/categories/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`/categories/${id}`);
  },
};
