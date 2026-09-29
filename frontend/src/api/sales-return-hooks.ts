import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  salesReturnsApi,
  type CreateSalesReturnRequest,
  type SalesReturnResult,
} from './sales-returns';
import { transactionKeys } from './transaction-hooks';
import { reportKeys } from './report-hooks';

export function useCreateSalesReturn(): UseMutationResult<
  SalesReturnResult,
  Error,
  CreateSalesReturnRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesReturnsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
