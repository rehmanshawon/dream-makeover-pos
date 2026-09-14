import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { inventoryApi } from './inventory';
import type { StockMovement, StockInRequest, AdjustmentRequest } from '../types/products';
import { productKeys } from './product-hooks';

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

export function useStockIn(): UseMutationResult<StockMovement, Error, StockInRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => inventoryApi.stockIn(payload),
    onSuccess: (_movement, variables) => {
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.productHistory(variables.productId),
      });
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

export function useAdjustStock(): UseMutationResult<StockMovement, Error, AdjustmentRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => inventoryApi.adjust(payload),
    onSuccess: (_movement, variables) => {
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.productHistory(variables.productId),
      });
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}
