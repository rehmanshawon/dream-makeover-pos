import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SalaryPaymentsService } from '../src/salary-payments/salary-payments.service';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { Employee } from '../src/employees/employee.entity';
import { CreateSalaryPaymentDto } from '../src/salary-payments/dto/create-salary-payment.dto';

describe('SalaryPaymentsService', () => {
  let service: SalaryPaymentsService;
  let paymentRepo: Repository<SalaryPayment>;
  let employeeRepo: Repository<Employee>;

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
      ],
    }).compile();

    service = module.get(SalaryPaymentsService);
    paymentRepo = module.get(getRepositoryToken(SalaryPayment));
    employeeRepo = module.get(getRepositoryToken(Employee));
  });

  it('records payment with defaults when optional fields omitted', async () => {
    jest.spyOn(employeeRepo, 'findOne').mockResolvedValue({ id: 'emp-1' } as Employee);

    const dto: CreateSalaryPaymentDto = {
      employeeId: 'emp-1',
      amountMinor: 3500000,
      paidOn: '2026-01-31',
    };

    const created = {
      id: 'pay-1',
      employeeId: 'emp-1',
      amountMinor: 3500000,
      paymentType: SalaryPaymentType.REGULAR,
      paymentMethod: PaymentMethod.CASH,
      paidOn: '2026-01-31',
      note: null,
      paidBy: 'admin',
      createdAt: new Date(),
    } as SalaryPayment;

    jest.spyOn(paymentRepo, 'create').mockReturnValue(created);
    jest.spyOn(paymentRepo, 'save').mockResolvedValue(created);

    const result = await service.create(dto, 'admin');

    expect(result.paymentType).toBe(SalaryPaymentType.REGULAR);
    expect(result.paymentMethod).toBe(PaymentMethod.CASH);
    expect(result.paidBy).toBe('admin');
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
});
