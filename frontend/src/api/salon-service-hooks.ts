import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { salonServicesApi } from './salon-services';
import type { SalonService } from '../types/services';

export const salonServiceKeys = {
  all: ['salon-services'] as const,
  list: () => [...salonServiceKeys.all, 'list'] as const,
};

export function useSalonServices(): UseQueryResult<SalonService[], Error> {
  return useQuery({
    queryKey: salonServiceKeys.list(),
    queryFn: () => salonServicesApi.list(true),
  });
}
