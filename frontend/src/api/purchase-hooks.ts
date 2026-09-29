import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from './purchases';
import type { CreatePurchaseRequest } from '../types/purchases';
import { accountingKeys } from './accounting-hooks';
import { inventoryKeys } from './inventory-hooks';
import { productKeys } from './product-hooks';

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
