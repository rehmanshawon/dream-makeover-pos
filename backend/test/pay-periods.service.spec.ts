import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PayPeriodsService } from '../src/payroll/pay-periods.service';
import { PayPeriod } from '../src/payroll/pay-period.entity';
import { PayPeriodStatus } from '../src/payroll/pay-period-status.enum';
import { Employee } from '../src/employees/employee.entity';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { AttendanceService } from '../src/attendance/attendance.service';

const period = (overrides: Partial<PayPeriod> = {}): PayPeriod =>
  ({
    id: 'period-1',
    name: 'January 2026',
    year: 2026,
    month: 1,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: PayPeriodStatus.OPEN,
    closedAt: null,
    closedBy: null,
    ...overrides,
  }) as PayPeriod;

const employee = (overrides: Partial<Employee> = {}): Employee =>
  ({
    id: 'employee-1',
    fullName: 'Asha Rahman',
    role: 'Stylist',
    salaryMinor: 3000000,
    salaryFrequency: 'MONTHLY',
    defaultPaymentMethod: PaymentMethod.CASH,
    joinDate: '2026-01-01',
    ...overrides,
  }) as Employee;

describe('PayPeriodsService', () => {
  let service: PayPeriodsService;
  let periodRepo: jest.Mocked<Partial<Repository<PayPeriod>>>;
  let employeeRepo: jest.Mocked<Partial<Repository<Employee>>>;
  let paymentRepo: jest.Mocked<Partial<Repository<SalaryPayment>>>;
  let dataSource: { getRepository: jest.Mock; transaction: jest.Mock };
  let attendanceService: { getWorkedDays: jest.Mock };

  beforeEach(async () => {
    periodRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    employeeRepo = { find: jest.fn() };
    paymentRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    attendanceService = { getWorkedDays: jest.fn() };
    dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Employee ? employeeRepo : paymentRepo,
      ),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayPeriodsService,
        { provide: getRepositoryToken(PayPeriod), useValue: periodRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AttendanceService, useValue: attendanceService },
      ],
    }).compile();

    service = module.get(PayPeriodsService);
  });

  it('returns periods ordered by start date', async () => {
    const records = [period(), period({ id: 'period-2', name: 'February 2026' })];
    periodRepo.find!.mockResolvedValue(records);

    const result = await service.findAll();

    expect(periodRepo.find).toHaveBeenCalledWith({ order: { startDate: 'DESC' } });
    expect(result).toEqual(records.map(({ year: _year, month: _month, ...record }) => record));
  });

  it('creates an open period from year and month', async () => {
    const created = period({ year: 2026, month: 1 });
    periodRepo.findOne!.mockResolvedValue(null);
    periodRepo.create!.mockReturnValue(created);
    periodRepo.save!.mockResolvedValue(created);

    const result = await service.create({
      year: 2026,
      month: 1,
    });

    expect(periodRepo.create).toHaveBeenCalledWith({
      year: 2026,
      month: 1,
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      status: PayPeriodStatus.OPEN,
    });
    expect(result.status).toBe(PayPeriodStatus.OPEN);
  });

  it('returns an existing period instead of creating a duplicate', async () => {
    const existing = period({ year: 2026, month: 9 });
    periodRepo.findOne!.mockResolvedValue(existing);

    await expect(service.ensurePeriodExists(2026, 9)).resolves.toBe(existing);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  it('recovers when another instance creates the period between lookup and save', async () => {
    const createdByOtherInstance = period({ year: 2026, month: 9 });
    periodRepo.findOne!.mockResolvedValueOnce(null).mockResolvedValueOnce(createdByOtherInstance);
    periodRepo.create!.mockImplementation((value) => value as PayPeriod);
    periodRepo.save!.mockRejectedValue(new Error('duplicate year/month key'));

    await expect(service.ensurePeriodExists(2026, 9)).resolves.toBe(createdByOtherInstance);
    expect(periodRepo.findOne).toHaveBeenCalledTimes(2);
  });

  it('fills missing periods between the oldest existing period and current month', async () => {
    const january = period({ year: 2026, month: 1 });
    const march = period({ id: 'period-march', year: 2026, month: 3, name: 'March 2026' });
    const existing = [january, march];
    const saved: PayPeriod[] = [];
    periodRepo.find!.mockResolvedValue(existing);
    periodRepo.findOne!.mockImplementation(async (options) => {
      const where = options?.where as { year?: number; month?: number };
      return (
        [...existing, ...saved].find(
          (candidate) => candidate.year === where.year && candidate.month === where.month,
        ) ?? null
      );
    });
    periodRepo.create!.mockImplementation((value) => value as PayPeriod);
    periodRepo.save!.mockImplementation(async (value) => {
      const created = value as PayPeriod;
      saved.push(created);
      return created;
    });

    await service.ensureMissingPeriodsThrough(2026, 3);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      year: 2026,
      month: 2,
      name: 'February 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      status: PayPeriodStatus.OPEN,
    });
  });

  it('allows past, current, and next month periods', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-23T12:00:00Z'));
    periodRepo.findOne!.mockResolvedValue(null);
    periodRepo.create!.mockImplementation((value) => value as PayPeriod);
    periodRepo.save!.mockImplementation(async (value) => value as PayPeriod);

    await expect(service.create({ year: 2026, month: 8 })).resolves.toMatchObject({
      name: 'August 2026',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    await expect(service.create({ year: 2026, month: 9 })).resolves.toMatchObject({
      name: 'September 2026',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    await expect(service.create({ year: 2026, month: 10 })).resolves.toMatchObject({
      name: 'October 2026',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    jest.useRealTimers();
  });

  it('rejects periods more than one month ahead and duplicate periods', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-23T12:00:00Z'));
    periodRepo.findOne!.mockResolvedValue(null);

    await expect(service.create({ year: 2026, month: 11 })).rejects.toThrow(BadRequestException);

    periodRepo.findOne!.mockResolvedValue(period({ year: 2026, month: 10 }));
    await expect(service.create({ year: 2026, month: 10 })).rejects.toThrow(ConflictException);

    jest.useRealTimers();
  });

  it('rejects invalid period input', async () => {
    await expect(service.create({ year: 2026, month: 13 })).rejects.toThrow(BadRequestException);
  });

  it('rejects missing periods and closing an already closed period', async () => {
    periodRepo.findOne!.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);

    periodRepo.findOne!.mockResolvedValue(period({ status: PayPeriodStatus.CLOSED }));
    await expect(service.close('period-1', 'admin')).rejects.toThrow(BadRequestException);
  });

  it('deletes an open period without recorded payments', async () => {
    periodRepo.findOne!.mockResolvedValue(period());
    paymentRepo.findOne!.mockResolvedValue(null);

    await expect(service.delete('period-1')).resolves.toBeUndefined();

    expect(paymentRepo.findOne).toHaveBeenCalledWith({ where: { payPeriodId: 'period-1' } });
    expect(periodRepo.delete).toHaveBeenCalledWith('period-1');
  });

  it('rejects deleting closed periods or periods with payments', async () => {
    periodRepo.findOne!.mockResolvedValue(period({ status: PayPeriodStatus.CLOSED }));
    await expect(service.delete('period-1')).rejects.toThrow(BadRequestException);

    periodRepo.findOne!.mockResolvedValue(period());
    paymentRepo.findOne!.mockResolvedValue({ id: 'payment-1' } as SalaryPayment);
    await expect(service.delete('period-1')).rejects.toThrow(BadRequestException);
    expect(periodRepo.delete).not.toHaveBeenCalled();
  });

  it('closes an open period with audit information', async () => {
    const open = period();
    periodRepo.findOne!.mockResolvedValue(open);
    periodRepo.save!.mockImplementation(async (value) => value as PayPeriod);

    const result = await service.close('period-1', 'admin');

    expect(result.status).toBe(PayPeriodStatus.CLOSED);
    expect(result.closedBy).toBe('admin');
    expect(result.closedAt).toBeInstanceOf(Date);
  });

  it('calculates payables from attendance and subtracts existing payments', async () => {
    const staff = employee();
    periodRepo.findOne!.mockResolvedValue(period());
    periodRepo.find!.mockResolvedValue([period()]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([
      {
        employeeId: staff.id,
        amountMinor: 100000,
        payPeriodId: 'period-1',
        paymentType: SalaryPaymentType.REGULAR,
      } as SalaryPayment,
    ]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 2.5, recordedDays: 3 });

    const result = await service.getPayables('period-1');

    expect(attendanceService.getWorkedDays).toHaveBeenCalledWith(
      staff.id,
      '2026-01-01',
      '2026-01-31',
    );
    expect(result[0]).toMatchObject({
      employeeId: staff.id,
      payableMinor: 2950000,
      alreadyPaidMinor: 100000,
      remainingMinor: 2850000,
      hasExistingPayment: true,
    });
  });

  it('deducts absent days from the fixed 30-day monthly salary', async () => {
    const staff = employee({ salaryMinor: 2000000 });
    const august = period({
      id: 'period-august',
      name: 'August 2026',
      month: 8,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    periodRepo.findOne!.mockResolvedValue(august);
    periodRepo.find!.mockResolvedValue([august]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 27, recordedDays: 31 });

    const result = await service.getPayables(august.id);

    expect(result[0].payableMinor).toBe(1733333);
  });

  it('falls back to calendar days when attendance is unrecorded', async () => {
    const staff = employee({ joinDate: '2026-01-11', salaryFrequency: 'DAILY', salaryMinor: 1000 });
    periodRepo.findOne!.mockResolvedValue(period());
    periodRepo.find!.mockResolvedValue([period()]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 0, recordedDays: 0 });

    const result = await service.getPayables('period-1');

    expect(result[0].payableMinor).toBe(21000);
  });

  it('uses 30 days for a full monthly salary in a 31-day month', async () => {
    const staff = employee({ salaryMinor: 3000000 });
    const january = period();
    periodRepo.findOne!.mockResolvedValue(january);
    periodRepo.find!.mockResolvedValue([january]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 0, recordedDays: 0 });

    const result = await service.getPayables(january.id);

    expect(result[0].payableMinor).toBe(3000000);
  });

  it('uses 30 days for a full monthly salary in February', async () => {
    const staff = employee({ salaryMinor: 3000000 });
    const february = period({
      id: 'period-2',
      name: 'February 2026',
      month: 2,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
    periodRepo.findOne!.mockResolvedValue(february);
    periodRepo.find!.mockResolvedValue([february]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 0, recordedDays: 0 });

    const result = await service.getPayables(february.id);

    expect(result[0].payableMinor).toBe(3000000);
  });

  it('caps monthly attendance at 30 payable days', async () => {
    const staff = employee({ salaryMinor: 3000000 });
    const january = period();
    periodRepo.findOne!.mockResolvedValue(january);
    periodRepo.find!.mockResolvedValue([january]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 31, recordedDays: 31 });

    const result = await service.getPayables(january.id);

    expect(result[0].payableMinor).toBe(3000000);
  });

  it('uses a partial advance adjustment as the current deduction', async () => {
    const staff = employee({ salaryMinor: 4000000 });
    const september = period({
      id: 'period-september',
      name: 'September 2026',
      month: 9,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    const october = period({
      id: 'period-october',
      name: 'October 2026',
      month: 10,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    periodRepo.findOne!.mockResolvedValue(october);
    periodRepo.find!.mockResolvedValue([september, october]);
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([
      {
        employeeId: staff.id,
        amountMinor: 500000,
        payPeriodId: null,
        paymentType: SalaryPaymentType.ADVANCE,
        paidOn: '2026-09-15',
      },
      {
        employeeId: staff.id,
        amountMinor: 200000,
        payPeriodId: october.id,
        paymentType: SalaryPaymentType.ADVANCE_ADJUSTMENT,
        paidOn: october.endDate,
      },
    ] as SalaryPayment[]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 30, recordedDays: 30 });

    const result = await service.getPayables(october.id);

    expect(result[0]).toMatchObject({
      totalDueMinor: 8000000,
      advanceMinor: 300000,
      alreadyPaidMinor: 0,
      remainingMinor: 7800000,
    });
  });

  it('runs payroll once and skips already paid employees', async () => {
    const staff = employee();
    const existing = employee({ id: 'employee-2', fullName: 'Already Paid' });
    const savedPayment = {
      id: 'payment-1',
      employeeId: staff.id,
      amountMinor: 3000000,
    } as SalaryPayment;
    const managerEmployeeRepo = { find: jest.fn().mockResolvedValue([staff, existing]) };
    const managerPaymentRepo = {
      find: jest.fn().mockResolvedValue([{ employeeId: existing.id } as SalaryPayment]),
      create: jest.fn().mockReturnValue(savedPayment),
      save: jest.fn().mockResolvedValue(savedPayment),
    };
    dataSource.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) =>
      callback({
        getRepository: (entity: unknown) =>
          entity === Employee ? managerEmployeeRepo : managerPaymentRepo,
      }),
    );
    periodRepo.findOne!.mockResolvedValue(period());
    periodRepo.find!.mockResolvedValue([period()]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 30, recordedDays: 30 });

    const result = await service.runPayroll('period-1', 'admin');

    expect(result).toMatchObject({
      payPeriodId: 'period-1',
      createdCount: 1,
      skippedCount: 1,
      totalPaidMinor: 3000000,
    });
    expect(managerPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: staff.id,
        paymentType: SalaryPaymentType.REGULAR,
        paymentMethod: PaymentMethod.CASH,
        paidBy: 'admin',
      }),
    );
  });

  it('refuses bulk deletion when the selection contains payroll salary', async () => {
    const deletePaymentsMock = jest.fn();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'payment-regular',
          payPeriodId: 'period-1',
          paymentType: SalaryPaymentType.REGULAR,
        } as SalaryPayment,
      ]),
    };
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      delete: deletePaymentsMock,
    };
    dataSource.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) =>
      callback({ getRepository: () => repo }),
    );

    await expect(service.deletePayments(['payment-regular'])).rejects.toThrow(
      'Payroll salary payments and advance adjustments cannot be deleted.',
    );
    expect(deletePaymentsMock).not.toHaveBeenCalled();
  });
});
