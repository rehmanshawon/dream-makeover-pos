import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { reportsApi } from './reports';
import type { FinancialRangeQuery } from './dashboard';
import type { RevenueTrend, TopItems, ExpenseBreakdown } from '../types/dashboard-reports';

export const reportKeys = {
  all: ['reports'] as const,
  trend: (query: FinancialRangeQuery) => [...reportKeys.all, 'trend', query] as const,
  topProducts: (query: FinancialRangeQuery, limit: number) =>
    [...reportKeys.all, 'top-products', query, limit] as const,
  topServices: (query: FinancialRangeQuery, limit: number) =>
    [...reportKeys.all, 'top-services', query, limit] as const,
  expenseBreakdown: (query: FinancialRangeQuery) =>
    [...reportKeys.all, 'expense-breakdown', query] as const,
};

export function useRevenueTrend(query: FinancialRangeQuery): UseQueryResult<RevenueTrend, Error> {
  return useQuery({
    queryKey: reportKeys.trend(query),
    queryFn: () => reportsApi.revenueTrend(query),
  });
}

export function useTopProducts(
  query: FinancialRangeQuery,
  limit = 5,
): UseQueryResult<TopItems, Error> {
  return useQuery({
    queryKey: reportKeys.topProducts(query, limit),
    queryFn: () => reportsApi.topProducts(query, limit),
  });
}

export function useTopServices(
  query: FinancialRangeQuery,
  limit = 5,
): UseQueryResult<TopItems, Error> {
  return useQuery({
    queryKey: reportKeys.topServices(query, limit),
    queryFn: () => reportsApi.topServices(query, limit),
  });
}

export function useExpenseBreakdown(
  query: FinancialRangeQuery,
): UseQueryResult<ExpenseBreakdown, Error> {
  return useQuery({
    queryKey: reportKeys.expenseBreakdown(query),
    queryFn: () => reportsApi.expenseBreakdown(query),
  });
}
