import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ExpensePaymentMethod } from './expense-payment-method.enum';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  /**
   * Records a new expense.
   *
   * `createdBy` is taken from the authenticated user, not the request body.
   * This ensures the audit trail cannot be spoofed by the client.
   */
  async create(dto: CreateExpenseDto, createdBy: string): Promise<ExpenseResponseDto> {
    const expense = this.expenseRepository.create({
      category: dto.category,
      amountMinor: dto.amountMinor,
      expenseDate: dto.expenseDate,
      paymentMethod: dto.paymentMethod ?? ExpensePaymentMethod.CASH,
      payee: dto.payee ?? null,
      reference: dto.reference ?? null,
      note: dto.note ?? null,
      createdBy,
    });

    const saved = await this.expenseRepository.save(expense);
    return this.toResponseDto(saved);
  }

  /**
   * Lists expenses with optional date-range and category filters.
   *
   * Filters compose:
   * - from only → expenses on or after `from`
   * - to only → expenses on or before `to`
   * - both → expenses within the closed interval
   * - category → restrict to one category
   *
   * Results are ordered by expense date, newest first.
   */
  async findAll(query: ExpenseQueryDto = {}): Promise<ExpenseResponseDto[]> {
    const where: Record<string, unknown> = {};

    if (query.from && query.to) {
      where.expenseDate = Between(query.from, query.to);
    } else if (query.from) {
      where.expenseDate = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.expenseDate = LessThanOrEqual(query.to);
    }

    if (query.category) {
      where.category = query.category;
    }

    const expenses = await this.expenseRepository.find({
      where,
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });

    return expenses.map((e) => this.toResponseDto(e));
  }

  async findById(id: string): Promise<ExpenseResponseDto> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return this.toResponseDto(expense);
  }

  /**
   * Partially updates an expense.
   *
   * Only fields present in the DTO are changed. Omitted fields remain as-is.
   * `createdBy` is never modified: it reflects the original recorder.
   */
  async update(id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (dto.category !== undefined) expense.category = dto.category;
    if (dto.amountMinor !== undefined) expense.amountMinor = dto.amountMinor;
    if (dto.expenseDate !== undefined) expense.expenseDate = dto.expenseDate;
    if (dto.paymentMethod !== undefined) expense.paymentMethod = dto.paymentMethod;
    if (dto.payee !== undefined) expense.payee = dto.payee;
    if (dto.reference !== undefined) expense.reference = dto.reference;
    if (dto.note !== undefined) expense.note = dto.note;

    const saved = await this.expenseRepository.save(expense);
    return this.toResponseDto(saved);
  }

  /**
   * Physically removes an expense.
   *
   * We do not implement reversal entries. A mistaken expense is simply
   * deleted. This is a deliberate trade-off for a small business context.
   */
  async remove(id: string): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    await this.expenseRepository.remove(expense);
  }

  private toResponseDto(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      category: expense.category,
      amountMinor: expense.amountMinor,
      expenseDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      payee: expense.payee,
      reference: expense.reference,
      note: expense.note,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
