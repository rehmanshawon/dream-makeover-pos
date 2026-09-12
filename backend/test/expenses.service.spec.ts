import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExpensesService } from '../src/expenses/expenses.service';
import { Expense } from '../src/expenses/expense.entity';
import { ExpenseCategory } from '../src/expenses/expense-category.enum';
import { ExpensePaymentMethod } from '../src/expenses/expense-payment-method.enum';
import { CreateExpenseDto } from '../src/expenses/dto/create-expense.dto';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let repository: Repository<Expense>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getRepositoryToken(Expense),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ExpensesService);
    repository = module.get(getRepositoryToken(Expense));
  });

  it('creates expense with defaults when optional fields omitted', async () => {
    const dto: CreateExpenseDto = {
      category: ExpenseCategory.ELECTRICITY,
      amountMinor: 250000,
      expenseDate: '2026-01-15',
    };

    const saved = {
      id: 'exp-1',
      ...dto,
      paymentMethod: ExpensePaymentMethod.CASH,
      payee: null,
      reference: null,
      note: null,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Expense;

    jest.spyOn(repository, 'create').mockReturnValue(saved);
    jest.spyOn(repository, 'save').mockResolvedValue(saved);

    const result = await service.create(dto, 'admin');

    expect(result.category).toBe(ExpenseCategory.ELECTRICITY);
    expect(result.paymentMethod).toBe(ExpensePaymentMethod.CASH);
    expect(result.createdBy).toBe('admin');
  });

  it('uses createdBy from the second argument, not the DTO', async () => {
    const dto: CreateExpenseDto = {
      category: ExpenseCategory.RENT,
      amountMinor: 5000000,
      expenseDate: '2026-01-01',
    };

    const createSpy = jest
      .spyOn(repository, 'create')
      .mockImplementation((input) => input as Expense);
    jest.spyOn(repository, 'save').mockImplementation(
      async (e) =>
        ({
          ...e,
          id: 'exp-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as Expense,
    );

    await service.create(dto, 'trusted_admin');

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'trusted_admin' }));
  });

  it('throws NotFoundException on findById when missing', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('applies date-range filter when both from and to are provided', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);

    await service.findAll({ from: '2026-01-01', to: '2026-01-31' });

    expect(repository.find).toHaveBeenCalledWith({
      where: { expenseDate: Between('2026-01-01', '2026-01-31') },
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  });

  it('applies from-only filter', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);

    await service.findAll({ from: '2026-01-01' });

    expect(repository.find).toHaveBeenCalledWith({
      where: { expenseDate: MoreThanOrEqual('2026-01-01') },
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  });

  it('applies to-only filter', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);

    await service.findAll({ to: '2026-01-31' });

    expect(repository.find).toHaveBeenCalledWith({
      where: { expenseDate: LessThanOrEqual('2026-01-31') },
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  });

  it('combines category with date range', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);

    await service.findAll({
      from: '2026-01-01',
      to: '2026-01-31',
      category: ExpenseCategory.RENT,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        expenseDate: Between('2026-01-01', '2026-01-31'),
        category: ExpenseCategory.RENT,
      },
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  });

  it('updates only the provided fields', async () => {
    const existing = {
      id: 'exp-1',
      category: ExpenseCategory.ELECTRICITY,
      amountMinor: 250000,
      expenseDate: '2026-01-15',
      paymentMethod: ExpensePaymentMethod.CASH,
      payee: 'DESCO',
      reference: null,
      note: null,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Expense;

    jest.spyOn(repository, 'findOne').mockResolvedValue(existing);
    jest.spyOn(repository, 'save').mockImplementation(async (e) => e as Expense);

    const result = await service.update('exp-1', { amountMinor: 300000 });

    expect(result.amountMinor).toBe(300000);
    expect(result.payee).toBe('DESCO');
    expect(result.category).toBe(ExpenseCategory.ELECTRICITY);
  });

  it('throws NotFoundException on remove when missing', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
