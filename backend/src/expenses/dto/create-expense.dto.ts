import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { ExpenseCategory } from '../expense-category.enum';
import { ExpensePaymentMethod } from '../expense-payment-method.enum';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expenseDate must be in YYYY-MM-DD format',
  })
  expenseDate: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  @Length(0, 150)
  payee?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}
