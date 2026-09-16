import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { packagesApi } from './packages';
import type { Package, CreatePackageRequest, UpdatePackageRequest } from '../types/packages';

export const packageKeys = {
  all: ['packages'] as const,
  list: (activeOnly: boolean) => [...packageKeys.all, 'list', activeOnly] as const,
  detail: (id: string) => [...packageKeys.all, 'detail', id] as const,
};

export function usePackages(activeOnly = false): UseQueryResult<Package[], Error> {
  return useQuery({
    queryKey: packageKeys.list(activeOnly),
    queryFn: () => packagesApi.list(activeOnly),
  });
}

export function usePackage(id: string | undefined): UseQueryResult<Package, Error> {
  return useQuery({
    queryKey: packageKeys.detail(id ?? ''),
    queryFn: () => packagesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePackage(): UseMutationResult<Package, Error, CreatePackageRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePackageRequest) => packagesApi.create(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.all });
      queryClient.setQueryData(packageKeys.detail(created.id), created);
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
