import { ExpenseCategory } from '../expense-category.enum';
import { ExpensePaymentMethod } from '../expense-payment-method.enum';

export class ExpenseResponseDto {
  id: string;
  category: ExpenseCategory;
  amountMinor: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  payee: string | null;
  reference: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
