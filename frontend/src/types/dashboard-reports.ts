export interface RevenueTrendPoint {
  date: string;
  revenueMinor: number;
  transactionCount: number;
}

export interface RevenueTrend {
  from: string;
  to: string;
  points: RevenueTrendPoint[];
}

export interface TopItem {
  itemId: string;
  itemName: string;
  quantitySold: number;
  revenueMinor: number;
}

export interface TopItems {
  from: string;
  to: string;
  items: TopItem[];
}

export interface ExpenseCategoryTotal {
  category: string;
  amountMinor: number;
  count: number;
}

export interface ExpenseBreakdown {
  from: string;
  to: string;
  totalMinor: number;
  salaryPaymentsMinor: number;
  categories: ExpenseCategoryTotal[];
}
