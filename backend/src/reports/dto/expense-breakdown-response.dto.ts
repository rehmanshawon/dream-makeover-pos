export class ExpenseCategoryTotalDto {
  category: string;
  amountMinor: number;
  count: number;
}

export class ExpenseBreakdownResponseDto {
  from: string;
  to: string;
  totalMinor: number;
  salaryPaymentsMinor: number;
  categories: ExpenseCategoryTotalDto[];
}
