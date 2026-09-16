import { api } from './api-client';
import type { RevenueTrend, TopItems, ExpenseBreakdown } from '../types/dashboard-reports';
import type { FinancialRangeQuery } from './dashboard';

function toQueryString(query: FinancialRangeQuery): string {
  const params = new URLSearchParams({ range: query.range });
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params.toString();
}

export const reportsApi = {
  revenueTrend(query: FinancialRangeQuery): Promise<RevenueTrend> {
    return api.get<RevenueTrend>(`/reports/revenue-trend?${toQueryString(query)}`);
  },

  topProducts(query: FinancialRangeQuery, limit = 5): Promise<TopItems> {
    const base = toQueryString(query);
    return api.get<TopItems>(`/reports/top-products?${base}&limit=${limit}`);
  },

  topServices(query: FinancialRangeQuery, limit = 5): Promise<TopItems> {
    const base = toQueryString(query);
    return api.get<TopItems>(`/reports/top-services?${base}&limit=${limit}`);
  },

  expenseBreakdown(query: FinancialRangeQuery): Promise<ExpenseBreakdown> {
    return api.get<ExpenseBreakdown>(`/reports/expense-breakdown?${toQueryString(query)}`);
  },
};
