import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { salaryPaymentsApi } from './salary-payments';
import type { SalaryPayment, CreateSalaryPaymentRequest } from '../types/salary-payments';
import { payrollKeys } from './payroll-hooks';

export const salaryPaymentKeys = {
  all: ['salary-payments'] as const,
  forPeriod: (payPeriodId: string) => [...salaryPaymentKeys.all, 'period', payPeriodId] as const,
  forEmployee: (employeeId: string) => [...salaryPaymentKeys.all, 'employee', employeeId] as const,
};

export function useSalaryPayments(
  payPeriodId: string | undefined,
): UseQueryResult<SalaryPayment[], Error> {
  return useQuery({
    queryKey: salaryPaymentKeys.forPeriod(payPeriodId ?? ''),
    queryFn: async () => {
      const payments = await salaryPaymentsApi.list();
      return payments.filter((payment) => payment.payPeriodId === payPeriodId);
    },
    enabled: Boolean(payPeriodId),
  });
}

export function useEmployeeSalaryPayments(
  employeeId: string | undefined,
): UseQueryResult<SalaryPayment[], Error> {
  return useQuery({
    queryKey: salaryPaymentKeys.forEmployee(employeeId ?? ''),
    queryFn: () => salaryPaymentsApi.listForEmployee(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useCreateSalaryPayment(): UseMutationResult<
  SalaryPayment,
  Error,
  CreateSalaryPaymentRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => salaryPaymentsApi.create(payload),
    onSuccess: (_payment, variables) => {
      void queryClient.invalidateQueries({
        queryKey: salaryPaymentKeys.forEmployee(variables.employeeId),
      });
      void queryClient.invalidateQueries({ queryKey: salaryPaymentKeys.all });
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useDeleteSalaryPayment(): UseMutationResult<
  void,
  Error,
  { id: string; employeeId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => salaryPaymentsApi.remove(id),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: salaryPaymentKeys.forEmployee(variables.employeeId),
      });
      void queryClient.invalidateQueries({ queryKey: salaryPaymentKeys.all });
    },
  });
}
