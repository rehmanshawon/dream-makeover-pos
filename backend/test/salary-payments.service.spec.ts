import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SalaryPaymentsService } from '../src/salary-payments/salary-payments.service';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { BonusType } from '../src/salary-payments/bonus-type.enum';
import { Employee } from '../src/employees/employee.entity';
import { CreateSalaryPaymentDto } from '../src/salary-payments/dto/create-salary-payment.dto';
import { PayPeriod } from '../src/payroll/pay-period.entity';
import { PayPeriodStatus } from '../src/payroll/pay-period-status.enum';

describe('SalaryPaymentsService', () => {
  let service: SalaryPaymentsService;
  let paymentRepo: Repository<SalaryPayment>;
  let employeeRepo: Repository<Employee>;
  let payPeriodRepo: Repository<PayPeriod>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalaryPaymentsService,
        {
          provide: getRepositoryToken(SalaryPayment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayPeriod),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SalaryPaymentsService);
    paymentRepo = module.get(getRepositoryToken(SalaryPayment));
    employeeRepo = module.get(getRepositoryToken(Employee));
    payPeriodRepo = module.get(getRepositoryToken(PayPeriod));
  });

  it('records a non-regular payment with defaults when optional fields omitted', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);

    const dto: CreateSalaryPaymentDto = {
      employeeId: 'emp-1',
      amountMinor: 3500000,
      paymentType: SalaryPaymentType.BONUS,
      bonusType: BonusType.FESTIVAL,
      paidOn: '2026-01-31',
    };

    const created = {
      id: 'pay-1',
      employeeId: 'emp-1',
      amountMinor: 3500000,
      paymentType: SalaryPaymentType.BONUS,
      paymentMethod: PaymentMethod.CASH,
      paidOn: '2026-01-31',
      note: null,
      bonusType: BonusType.FESTIVAL,
      overtimeHours: null,
      overtimeDate: null,
      paidBy: 'admin',
      createdAt: new Date(),
    } as SalaryPayment;

    jest.spyOn(paymentRepo, 'create').mockReturnValue(created);
    jest.spyOn(paymentRepo, 'save').mockResolvedValue(created);

    const result = await service.create(dto, 'admin');

    expect(result.paymentType).toBe(SalaryPaymentType.BONUS);
    expect(result.paymentMethod).toBe(PaymentMethod.CASH);
    expect(result.paidBy).toBe('admin');
    expect(result.bonusType).toBe(BonusType.FESTIVAL);
  });

  it('persists overtime and mobile-number metadata', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);
    const dto: CreateSalaryPaymentDto = {
      employeeId: 'emp-1',
      amountMinor: 250000,
      paymentType: SalaryPaymentType.OVERTIME,
      paymentMethod: PaymentMethod.MOBILE,
      paidOn: '2026-01-31',
      overtimeHours: 5,
      overtimeDate: '2026-01-29',
      mobileWalletNumber: '01712345678',
    };
    const created = {
      id: 'pay-2',
      employeeId: 'emp-1',
      amountMinor: 250000,
      paymentType: SalaryPaymentType.OVERTIME,
      paymentMethod: PaymentMethod.MOBILE,
      paidOn: dto.paidOn,
      overtimeHours: dto.overtimeHours,
      overtimeDate: dto.overtimeDate,
      mobileWalletNumber: dto.mobileWalletNumber,
      paidBy: 'admin',
      createdAt: new Date(),
    } as SalaryPayment;
    jest.spyOn(paymentRepo, 'create').mockReturnValue(created);
    jest.spyOn(paymentRepo, 'save').mockResolvedValue(created);

    const result = await service.create(dto, 'admin');

    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        overtimeHours: 5,
        overtimeDate: '2026-01-29',
        mobileWalletNumber: '01712345678',
      }),
    );
    expect(result.overtimeHours).toBe(5);
    expect(result.overtimeDate).toBe('2026-01-29');
  });

  it('requires a cheque number for cheque payments', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);

    await expect(
      service.create(
        {
          employeeId: 'emp-1',
          amountMinor: 100000,
          paymentType: SalaryPaymentType.BONUS,
          bonusType: BonusType.ANNUAL,
          paymentMethod: PaymentMethod.BANK,
          paidOn: '2026-01-31',
        },
        'admin',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects overtime above the 12-hour limit', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);

    await expect(
      service.create(
        {
          employeeId: 'emp-1',
          amountMinor: 100000,
          paymentType: SalaryPaymentType.OVERTIME,
          paidOn: '2026-01-31',
          overtimeHours: 13,
          overtimeDate: '2026-01-29',
        },
        'admin',
      ),
    ).rejects.toThrow('Overtime payments require 1 to 12 hours and a work date.');
  });

  it('throws NotFoundException when employee does not exist', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(null);

    await expect(
      service.create(
        {
          employeeId: 'missing',
          amountMinor: 100000,
          paidOn: '2026-01-31',
        },
        'admin',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException on findById when payment missing', async () => {
    jest.spyOn(paymentRepo, 'findOne').mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('filters payments by employee', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);
    jest.spyOn(paymentRepo, 'find').mockResolvedValue([]);

    await service.findByEmployee('emp-1');

    expect(paymentRepo.find).toHaveBeenCalledWith({
      where: { employeeId: 'emp-1' },
      order: { paidOn: 'DESC', createdAt: 'DESC' },
    });
  });

  it('throws NotFoundException on remove when payment missing', async () => {
    jest.spyOn(paymentRepo, 'findOne').mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });

  it('refuses to delete a payroll-linked salary payment', async () => {
    const payment = {
      id: 'pay-1',
      employeeId: 'emp-1',
      payPeriodId: 'period-1',
      paymentType: SalaryPaymentType.REGULAR,
    } as SalaryPayment;
    jest.spyOn(paymentRepo, 'findOne').mockResolvedValue(payment);

    await expect(service.remove('pay-1')).rejects.toThrow(BadRequestException);
    expect(paymentRepo.remove).not.toHaveBeenCalled();
  });

  it('allows deletion of a Staff-originated advance', async () => {
    const payment = {
      id: 'pay-advance',
      employeeId: 'emp-1',
      payPeriodId: null,
      paymentType: SalaryPaymentType.ADVANCE,
    } as SalaryPayment;
    jest.spyOn(paymentRepo, 'findOne').mockResolvedValue(payment);
    jest.spyOn(paymentRepo, 'remove').mockResolvedValue(payment);

    await service.remove(payment.id);

    expect(paymentRepo.remove).toHaveBeenCalledWith(payment);
  });
});
