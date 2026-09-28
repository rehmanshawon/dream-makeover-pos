import { useQuery } from '@tanstack/react-query';
import { timeTrustApi } from './time-trust';

export const timeTrustQueryKey = ['system', 'time-trust'] as const;

export function usePayrollTimeTrust() {
  return useQuery({
    queryKey: timeTrustQueryKey,
    queryFn: () => timeTrustApi.getStatus(),
    refetchInterval: 30_000,
    retry: false,
  });
}
