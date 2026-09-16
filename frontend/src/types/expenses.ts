export type ExpenseCategory =
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'RENT'
  | 'MAINTENANCE'
  | 'CLEANING'
  | 'STATIONERY'
  | 'TRANSPORTATION'
  | 'MARKETING'
  | 'EQUIPMENT'
  | 'MISC';

export type ExpensePaymentMethod = 'CASH' | 'BANK' | 'MOBILE' | 'CARD' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountMinor: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  payee: string | null;
  reference: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  amountMinor: number;
  expenseDate: string;
  paymentMethod?: ExpensePaymentMethod;
  payee?: string;
  reference?: string;
  note?: string;
}

export interface UpdateExpenseRequest {
  category?: ExpenseCategory;
  amountMinor?: number;
  expenseDate?: string;
  paymentMethod?: ExpensePaymentMethod;
  payee?: string;
  reference?: string;
  note?: string;
}

export interface ExpenseListQuery {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'ELECTRICITY',
  'WATER',
  'INTERNET',
  'RENT',
  'MAINTENANCE',
  'CLEANING',
  'STATIONERY',
  'TRANSPORTATION',
  'MARKETING',
  'EQUIPMENT',
  'MISC',
];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  'CASH',
  'BANK',
  'MOBILE',
  'CARD',
  'OTHER',
];

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: 'Cash',
  BANK: 'Bank transfer',
  MOBILE: 'Mobile banking',
  CARD: 'Card',
  OTHER: 'Other',
};
