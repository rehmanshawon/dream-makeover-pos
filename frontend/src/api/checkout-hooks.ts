import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { checkoutApi } from './checkout';
import type { CheckoutRequest, CheckoutResponse } from '../types/checkout';
import { productKeys } from './product-hooks';
import { customerKeys } from './customer-hooks';
import { inventoryKeys } from './inventory-hooks';

export function useCheckout(): UseMutationResult<CheckoutResponse, Error, CheckoutRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutRequest) => checkoutApi.submit(payload),
    onSuccess: () => {
      // A sale changes product stock, customer balances, and inventory
      // history. We invalidate at the prefix level so all dependent
      // queries refresh on next access.
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
