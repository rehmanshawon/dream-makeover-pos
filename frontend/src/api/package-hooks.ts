import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { packagesApi } from './packages';
import type { Package } from '../types/packages';

export const packageKeys = {
  all: ['packages'] as const,
  list: () => [...packageKeys.all, 'list'] as const,
};

export function usePackages(): UseQueryResult<Package[], Error> {
  return useQuery({
    queryKey: packageKeys.list(),
    queryFn: () => packagesApi.list(true),
  });
}
