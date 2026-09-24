import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { payrollApi } from './payroll';
import type {
  PayPeriod,
  PayableEmployee,
  RunPayrollResult,
  CreatePayPeriodRequest,
  CreatePayrollSalaryPaymentRequest,
  AdjustAdvanceRequest,
} from '../types/payroll';
import type { SalaryPayment } from '../types/salary-payments';

export const payrollKeys = {
  all: ['payroll'] as const,
  periods: () => [...payrollKeys.all, 'periods'] as const,
  period: (id: string) => [...payrollKeys.all, 'period', id] as const,
  payables: (id: string) => [...payrollKeys.all, 'payables', id] as const,
};

export function usePayPeriods(): UseQueryResult<PayPeriod[], Error> {
  return useQuery({
    queryKey: payrollKeys.periods(),
    queryFn: () => payrollApi.listPeriods(),
  });
}

export function usePayPeriod(id: string | undefined): UseQueryResult<PayPeriod, Error> {
  return useQuery({
    queryKey: payrollKeys.period(id ?? ''),
    queryFn: () => payrollApi.getPeriod(id as string),
    enabled: Boolean(id),
  });
}

export function usePayables(id: string | undefined): UseQueryResult<PayableEmployee[], Error> {
  return useQuery({
    queryKey: payrollKeys.payables(id ?? ''),
    queryFn: () => payrollApi.getPayables(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePayPeriod(): UseMutationResult<PayPeriod, Error, CreatePayPeriodRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => payrollApi.createPeriod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useDeletePayPeriod(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => payrollApi.deletePeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useClosePayPeriod(): UseMutationResult<PayPeriod, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => payrollApi.closePeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useRunPayroll(): UseMutationResult<RunPayrollResult, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => payrollApi.runPayroll(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useCreatePayrollSalaryPayment(): UseMutationResult<
  SalaryPayment,
  Error,
  { periodId: string; payload: CreatePayrollSalaryPaymentRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, payload }) => payrollApi.createSalaryPayment(periodId, payload),
    onSuccess: (_payment, variables) => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.payables(variables.periodId) });
      void queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
    },
  });
}

export function useAdjustAdvance(): UseMutationResult<
  SalaryPayment,
  Error,
  { periodId: string; payload: AdjustAdvanceRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, payload }) => payrollApi.adjustAdvance(periodId, payload),
    onSuccess: (_payment, variables) => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.payables(variables.periodId) });
      void queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
    },
  });
}

export function useDeletePayments(): UseMutationResult<{ deletedCount: number }, Error, string[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => payrollApi.deletePayments(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
    },
  });
}
