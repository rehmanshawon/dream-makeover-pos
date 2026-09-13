import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { inventoryApi } from './inventory';
import type { StockMovement } from '../types/products';

export const inventoryKeys = {
  all: ['inventory'] as const,
  productHistory: (productId: string) =>
    [...inventoryKeys.all, 'product-history', productId] as const,
};

export function useProductStockHistory(
  productId: string | undefined,
): UseQueryResult<StockMovement[], Error> {
  return useQuery({
    queryKey: inventoryKeys.productHistory(productId ?? ''),
    queryFn: () => inventoryApi.historyForProduct(productId as string),
    enabled: Boolean(productId),
  });
}
