export interface RevenueByType {
  productSalesMinor: number;
  serviceSalesMinor: number;
  packageSalesMinor: number;
  totalRevenueMinor: number;
}

export interface ExpenseByCategory {
  category: string;
  amountMinor: number;
}

export interface ExpenseBreakdown {
  salaryPaymentsMinor: number;
  shopExpensesMinor: number;
  totalOperatingExpensesMinor: number;
  shopExpensesByCategory: ExpenseByCategory[];
}

export interface FinancialSummary {
  range: { from: string; to: string };
  revenue: RevenueByType;
  discountsGivenMinor: number;
  cogsMinor: number;
  grossProfitMinor: number;
  expenses: ExpenseBreakdown;
  netOperatingResultMinor: number;
  metadata: {
    cogsMethod: string;
    generatedAt: string;
  };
}
