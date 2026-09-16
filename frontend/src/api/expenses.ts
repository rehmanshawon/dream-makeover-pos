import { api } from './api-client';
import type {
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseListQuery,
} from '../types/expenses';

function buildQueryString(query: ExpenseListQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.category) params.set('category', query.category);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const expensesApi = {
  list(query: ExpenseListQuery = {}): Promise<Expense[]> {
    return api.get<Expense[]>(`/expenses${buildQueryString(query)}`);
  },

  create(payload: CreateExpenseRequest): Promise<Expense> {
    return api.post<Expense>('/expenses', payload);
  },

  update(id: string, payload: UpdateExpenseRequest): Promise<Expense> {
    return api.patch<Expense>(`/expenses/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`/expenses/${id}`);
  },
};
