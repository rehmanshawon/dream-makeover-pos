import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { salonServicesApi } from './salon-services';
import type { SalonService, CreateServiceRequest, UpdateServiceRequest } from '../types/services';

export const salonServiceKeys = {
  all: ['salon-services'] as const,
  list: (activeOnly: boolean) => [...salonServiceKeys.all, 'list', activeOnly] as const,
  detail: (id: string) => [...salonServiceKeys.all, 'detail', id] as const,
};

export function useSalonServices(activeOnly = false): UseQueryResult<SalonService[], Error> {
  return useQuery({
    queryKey: salonServiceKeys.list(activeOnly),
    queryFn: () => salonServicesApi.list(activeOnly),
  });
}

export function useService(id: string | undefined): UseQueryResult<SalonService, Error> {
  return useQuery({
    queryKey: salonServiceKeys.detail(id ?? ''),
    queryFn: () => salonServicesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateService(): UseMutationResult<SalonService, Error, CreateServiceRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateServiceRequest) => salonServicesApi.create(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: salonServiceKeys.all });
      queryClient.setQueryData(salonServiceKeys.detail(created.id), created);
    },
  });
}

export function useUpdateService(): UseMutationResult<
  SalonService,
  Error,
  { id: string; payload: UpdateServiceRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => salonServicesApi.update(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: salonServiceKeys.all });
      queryClient.setQueryData(salonServiceKeys.detail(updated.id), updated);
    },
  });
}
