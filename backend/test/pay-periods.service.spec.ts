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
      create: jest.fn(),
      save: jest.fn(),
    };
    employeeRepo = { find: jest.fn() };
    paymentRepo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
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
    expect(result).toEqual(records);
  });

  it('creates an open period', async () => {
    const created = period();
    periodRepo.findOne!.mockResolvedValue(null);
    periodRepo.create!.mockReturnValue(created);
    periodRepo.save!.mockResolvedValue(created);

    const result = await service.create({
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(periodRepo.create).toHaveBeenCalledWith({
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      status: PayPeriodStatus.OPEN,
    });
    expect(result.status).toBe(PayPeriodStatus.OPEN);
  });

  it('rejects reversed and overlapping periods', async () => {
    await expect(
      service.create({ name: 'Invalid', startDate: '2026-02-01', endDate: '2026-01-01' }),
    ).rejects.toThrow(BadRequestException);

    periodRepo.findOne!.mockResolvedValue(period({ name: 'Existing period' }));
    await expect(
      service.create({ name: 'Overlap', startDate: '2026-01-15', endDate: '2026-02-15' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing and closed periods when updating', async () => {
    periodRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.update('missing', {
        name: 'Updated',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    ).rejects.toThrow(NotFoundException);

    periodRepo.findOne!.mockResolvedValue(period({ status: PayPeriodStatus.CLOSED }));
    await expect(
      service.update('period-1', {
        name: 'Updated',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    ).rejects.toThrow(BadRequestException);
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
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([
      { employeeId: staff.id, amountMinor: 100000 } as SalaryPayment,
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
      payableMinor: 250000,
      alreadyPaidMinor: 100000,
      remainingMinor: 150000,
      hasExistingPayment: true,
    });
  });

  it('falls back to calendar days when attendance is unrecorded', async () => {
    const staff = employee({ joinDate: '2026-01-11', salaryFrequency: 'DAILY', salaryMinor: 1000 });
    periodRepo.findOne!.mockResolvedValue(period());
    employeeRepo.find!.mockResolvedValue([staff]);
    paymentRepo.find!.mockResolvedValue([]);
    attendanceService.getWorkedDays.mockResolvedValue({ workedDays: 0, recordedDays: 0 });

    const result = await service.getPayables('period-1');

    expect(result[0].payableMinor).toBe(21000);
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
});
