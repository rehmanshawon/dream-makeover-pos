import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { expensesApi } from './expenses';
import type {
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseListQuery,
} from '../types/expenses';

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (query: ExpenseListQuery) => [...expenseKeys.all, 'list', query] as const,
};

export function useExpenses(query: ExpenseListQuery): UseQueryResult<Expense[], Error> {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: () => expensesApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateExpense(): UseMutationResult<Expense, Error, CreateExpenseRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => expensesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useUpdateExpense(): UseMutationResult<
  Expense,
  Error,
  { id: string; payload: UpdateExpenseRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => expensesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDeleteExpense(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
