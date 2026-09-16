import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { inventoryStatsApi } from './inventory-stats';
import type { InventoryStats } from '../types/inventory';

export const inventoryStatsKeys = {
  all: ['inventory-stats'] as const,
  summary: () => [...inventoryStatsKeys.all, 'summary'] as const,
};

export function useInventoryStats(): UseQueryResult<InventoryStats, Error> {
  return useQuery({
    queryKey: inventoryStatsKeys.summary(),
    queryFn: () => inventoryStatsApi.getStats(),
  });
}
