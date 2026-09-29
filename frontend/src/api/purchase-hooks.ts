import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from './purchases';
import type { CreatePurchaseRequest, CreateSupplierReturnRequest } from '../types/purchases';
import { accountingKeys } from './accounting-hooks';
import { inventoryKeys } from './inventory-hooks';
import { productKeys } from './product-hooks';

export const purchaseKeys = {
  all: ['purchases'] as const,
  returnableLines: (productId: string) =>
    [...purchaseKeys.all, 'returnable-lines', productId] as const,
};

export function useReturnablePurchaseLines(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: purchaseKeys.returnableLines(productId),
    queryFn: () => purchasesApi.returnableLines(productId),
    enabled,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseRequest) => purchasesApi.create(payload),
    onSuccess: (_purchase, variables) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      for (const line of variables.lines) {
        void queryClient.invalidateQueries({
          queryKey: inventoryKeys.productHistory(line.productId),
        });
      }
    },
  });
}

export function useCreateSupplierReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierReturnRequest) => purchasesApi.createReturn(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
    },
  });
}
