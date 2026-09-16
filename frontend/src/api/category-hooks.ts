import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { categoriesApi } from './categories';
import type {
  Category,
  CategoryNode,
  CategoryKind,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../types/categories';

export const categoryKeys = {
  all: ['categories'] as const,
  list: (kind?: CategoryKind) => [...categoryKeys.all, 'list', kind ?? 'all'] as const,
  tree: (kind?: CategoryKind) => [...categoryKeys.all, 'tree', kind ?? 'all'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
};

export function useCategories(kind?: CategoryKind): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: categoryKeys.list(kind),
    queryFn: () => categoriesApi.list(kind),
  });
}

export function useCategoryTree(kind?: CategoryKind): UseQueryResult<CategoryNode[], Error> {
  return useQuery({
    queryKey: categoryKeys.tree(kind),
    queryFn: () => categoriesApi.tree(kind),
  });
}

export function useCreateCategory(): UseMutationResult<Category, Error, CreateCategoryRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => categoriesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory(): UseMutationResult<
  Category,
  Error,
  { id: string; payload: UpdateCategoryRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => categoriesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
