import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { productsApi } from './products';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types/products';
import type { Package } from '../types/packages';
import { packageKeys } from './package-hooks';
import { packagesApi } from './packages';
import { UpdatePackageRequest } from '@/types/packages';

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(): UseQueryResult<Product[], Error> {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: () => productsApi.list(),
  });
}

export function useProduct(id: string | undefined): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => productsApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProduct(): UseMutationResult<Product, Error, CreateProductRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductRequest) => productsApi.create(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.setQueryData(productKeys.detail(created.id), created);
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  Product,
  Error,
  { id: string; payload: UpdateProductRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => productsApi.update(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.setQueryData(productKeys.detail(updated.id), updated);
    },
  });
}

export function useUpdatePackage(): UseMutationResult<
  Package,
  Error,
  { id: string; payload: UpdatePackageRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => packagesApi.update(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.all });
      queryClient.setQueryData(packageKeys.detail(updated.id), updated);
    },
  });
}
