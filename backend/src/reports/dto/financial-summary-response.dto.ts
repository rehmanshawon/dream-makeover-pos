export class RevenueByTypeDto {
  productSalesMinor: number;
  serviceSalesMinor: number;
  packageSalesMinor: number;
  totalRevenueMinor: number;
}

export class ExpenseByCategoryDto {
  category: string;
  amountMinor: number;
}

export class ExpenseBreakdownDto {
  salaryPaymentsMinor: number;
  shopExpensesMinor: number;
  totalOperatingExpensesMinor: number;
  shopExpensesByCategory: ExpenseByCategoryDto[];
}

export class FinancialSummaryResponseDto {
  range: {
    from: string;
    to: string;
  };
  revenue: RevenueByTypeDto;
  discountsGivenMinor: number;
  cogsMinor: number;
  grossProfitMinor: number;
  expenses: ExpenseBreakdownDto;
  netOperatingResultMinor: number;
  metadata: {
    cogsMethod: string;
    generatedAt: string;
  };
}
