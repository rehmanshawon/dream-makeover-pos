import { api } from './api-client';
import type { SalaryPayment, CreateSalaryPaymentRequest } from '../types/salary-payments';

export const salaryPaymentsApi = {
  list(): Promise<SalaryPayment[]> {
    return api.get<SalaryPayment[]>('/salary-payments');
  },

  listForEmployee(employeeId: string): Promise<SalaryPayment[]> {
    return api.get<SalaryPayment[]>(`/salary-payments/employee/${employeeId}`);
  },

  create(payload: CreateSalaryPaymentRequest): Promise<SalaryPayment> {
    return api.post<SalaryPayment>('/salary-payments', payload);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`/salary-payments/${id}`);
  },
};
