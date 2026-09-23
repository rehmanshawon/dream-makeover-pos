import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { PayPeriod } from './pay-period.entity';
import { PayPeriodStatus } from './pay-period-status.enum';
import { CreatePayPeriodDto } from './dto/create-pay-period.dto';
//import { UpdatePayPeriodDto } from './dto/update-pay-period.dto';
import { PayPeriodResponseDto } from './dto/pay-period-response.dto';
import { PayableEmployeeDto } from './dto/payable-employee.dto';
import { RunPayrollResponseDto } from './dto/run-payroll-response.dto';
import { Employee } from '../employees/employee.entity';
//import { EmployeeStatus } from '../employees/employee-status.enum';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { SalaryPaymentResponseDto } from '../salary-payments/dto/salary-payment-response.dto';
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
//import { PaymentMethod } from '../salary-payments/payment-method.enum';
import { AttendanceService } from '../attendance/attendance.service';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function nameFor(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function startOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function endOf(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

@Injectable()
export class PayPeriodsService {
  constructor(
    @InjectRepository(PayPeriod)
    private readonly periodRepository: Repository<PayPeriod>,
    private readonly dataSource: DataSource,
    private readonly attendanceService: AttendanceService,
  ) {}

  async findAll(): Promise<PayPeriodResponseDto[]> {
    const periods = await this.periodRepository.find({
      order: { startDate: 'DESC' },
    });
    return periods.map((p) => this.toResponse(p));
  }

  async findById(id: string): Promise<PayPeriodResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Pay period not found');
    return this.toResponse(period);
  }

  /**
   * Returns all employees who were eligible during the period,
   * along with their payable amounts.
   */
  async getPayables(periodId: string): Promise<PayableEmployeeDto[]> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Pay period not found');

    const employeeRepo = this.dataSource.getRepository(Employee);
    const paymentRepo = this.dataSource.getRepository(SalaryPayment);

    // Employees whose joinDate is on or before the period end, and who
    // are either still ACTIVE or were deactivated after the period started.
    // We do not currently store a deactivation date, so we approximate by
    // including all employees active at the time this code runs. A future
    // sprint will add an `deactivatedAt` column for accuracy.
    const employees = await employeeRepo.find({
      where: {
        joinDate: LessThanOrEqual(period.endDate),
      },
      order: { fullName: 'ASC' },
    });

    const existingPayments = await paymentRepo.find({
      where: { payPeriodId: periodId },
    });
    const paidByEmployee = new Map<string, number>();
    for (const p of existingPayments) {
      paidByEmployee.set(p.employeeId, (paidByEmployee.get(p.employeeId) ?? 0) + p.amountMinor);
    }

    return Promise.all(
      employees.map(async (e) => {
        const payableMinor = await this.computePayable(e, period);
        const alreadyPaidMinor = paidByEmployee.get(e.id) ?? 0;
        const remainingMinor = Math.max(0, payableMinor - alreadyPaidMinor);
        return {
          employeeId: e.id,
          employeeName: e.fullName,
          role: e.role,
          monthlySalaryMinor: e.salaryMinor,
          payableMinor,
          alreadyPaidMinor,
          remainingMinor,
          hasExistingPayment: paidByEmployee.has(e.id),
        };
      }),
    );
  }

  async create(dto: CreatePayPeriodDto): Promise<PayPeriodResponseDto> {
    // Reject far-future months
    const now = new Date();
    const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
    const allowed = nextMonth(current.year, current.month);
    const requested = { year: dto.year, month: dto.month };

    const isCurrent = requested.year === current.year && requested.month === current.month;
    const isNext = requested.year === allowed.year && requested.month === allowed.month;
    const isPast =
      requested.year < current.year ||
      (requested.year === current.year && requested.month < current.month);

    if (!isCurrent && !isNext && !isPast) {
      throw new BadRequestException(
        'Pay periods can be created for past and current months, and at most one month ahead.',
      );
    }

    const existing = await this.periodRepository.findOne({
      where: { year: dto.year, month: dto.month },
    });
    if (existing) {
      throw new ConflictException(
        `A pay period for ${nameFor(dto.year, dto.month)} already exists.`,
      );
    }

    const period = this.periodRepository.create({
      year: dto.year,
      month: dto.month,
      name: nameFor(dto.year, dto.month),
      startDate: startOf(dto.year, dto.month),
      endDate: endOf(dto.year, dto.month),
      status: PayPeriodStatus.OPEN,
    });
    const saved = await this.periodRepository.save(period);
    return this.toResponse(saved);
  }

  async getNextReminder(): Promise<{
    shouldRemind: boolean;
    nextMonth: { year: number; month: number; name: string };
    hasNextPeriod: boolean;
  }> {
    const now = new Date();
    const next = nextMonth(now.getFullYear(), now.getMonth() + 1);

    const existing = await this.periodRepository.findOne({
      where: { year: next.year, month: next.month },
    });

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const inLastWeek = dayOfMonth > daysInMonth - 7;

    return {
      shouldRemind: inLastWeek && !existing,
      nextMonth: { ...next, name: nameFor(next.year, next.month) },
      hasNextPeriod: Boolean(existing),
    };
  }

  async close(id: string, closedBy: string): Promise<PayPeriodResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Pay period is already closed');
    }
    period.status = PayPeriodStatus.CLOSED;
    period.closedAt = new Date();
    period.closedBy = closedBy;
    const saved = await this.periodRepository.save(period);
    return this.toResponse(saved);
  }

  async runPayroll(periodId: string, cashier: string): Promise<RunPayrollResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot run payroll on a closed period');
    }

    return await this.dataSource.transaction(async (manager) => {
      const employeeRepo = manager.getRepository(Employee);
      const paymentRepo = manager.getRepository(SalaryPayment);

      const employees = await employeeRepo.find({
        where: { joinDate: LessThanOrEqual(period.endDate) },
      });

      const existing = await paymentRepo.find({
        where: { payPeriodId: periodId },
      });
      const paidEmployeeIds = new Set(existing.map((p) => p.employeeId));

      const created: Array<{
        id: string;
        employeeId: string;
        employeeName: string;
        amountMinor: number;
      }> = [];
      let skippedCount = 0;
      let totalPaidMinor = 0;

      for (const e of employees) {
        if (paidEmployeeIds.has(e.id)) {
          skippedCount += 1;
          continue;
        }
        const payableMinor = await this.computePayable(e, period);
        if (payableMinor <= 0) {
          skippedCount += 1;
          continue;
        }

        const payment = paymentRepo.create({
          employeeId: e.id,
          payPeriodId: periodId,
          amountMinor: payableMinor,
          paymentType: SalaryPaymentType.REGULAR,
          paymentMethod: e.defaultPaymentMethod,
          paidOn: period.endDate,
          note: `Payroll run — ${period.name}`,
          paidBy: cashier,
        });
        const saved = await paymentRepo.save(payment);
        created.push({
          id: saved.id,
          employeeId: e.id,
          employeeName: e.fullName,
          amountMinor: saved.amountMinor,
        });
        totalPaidMinor += saved.amountMinor;
      }

      return {
        payPeriodId: periodId,
        createdCount: created.length,
        skippedCount,
        totalPaidMinor,
        payments: created,
      };
    });
  }

  /**
   * Computes the amount payable to an employee for a period.
   *
   * The formula:
   *   dailyRate = salary / days-in-frequency
   *   workingDays = number of days in the intersection of [joinDate, period]
   *   payable = dailyRate * workingDays
   *
   * Frequencies:
   *   MONTHLY → 30 days
   *   WEEKLY  → 7 days
   *   DAILY   → 1 day
   */
  /**
   * Computes the amount payable to an employee for a period.
   *
   * If the period has attendance records for the employee, the payable
   * is based on worked days (PRESENT = 1, HALF_DAY = 0.5, LEAVE = 1,
   * ABSENT = 0).
   *
   * If no attendance is recorded, the payable falls back to calendar
   * days from the employee's join date through the period end.
   */
  private async computePayable(employee: Employee, period: PayPeriod): Promise<number> {
    const frequencyDays =
      employee.salaryFrequency === 'MONTHLY' ? 30 : employee.salaryFrequency === 'WEEKLY' ? 7 : 1;
    const dailyRate = employee.salaryMinor / frequencyDays;

    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    const joinDate = new Date(employee.joinDate);
    const effectiveStart = joinDate > periodStart ? joinDate : periodStart;
    const effectiveStartStr = this.isoDate(effectiveStart);

    const { workedDays, recordedDays } = await this.attendanceService.getWorkedDays(
      employee.id,
      effectiveStartStr,
      period.endDate,
    );

    if (recordedDays > 0) {
      return Math.round(dailyRate * workedDays);
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(
      0,
      Math.floor((periodEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1,
    );
    return Math.round(dailyRate * days);
  }

  private isoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // private async assertNoOverlap(
  //   startDate: string,
  //   endDate: string,
  //   excludeId: string | null,
  // ): Promise<void> {
  //   const where: Record<string, unknown> = {
  //     startDate: LessThanOrEqual(endDate),
  //     endDate: MoreThanOrEqual(startDate),
  //   };
  //   if (excludeId) where.id = Not(excludeId);
  //   const conflict = await this.periodRepository.findOne({ where });
  //   if (conflict) {
  //     throw new ConflictException(`Pay period overlaps with existing period: ${conflict.name}`);
  //   }
  // }

  async deletePayments(ids: string[]): Promise<{ deletedCount: number }> {
    if (ids.length === 0) return { deletedCount: 0 };
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SalaryPayment);
      const payments = await repo
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids })
        .getMany();

      // Refuse deletion when any payment belongs to a closed period
      const periodIds = Array.from(
        new Set(payments.map((p) => p.payPeriodId).filter(Boolean)),
      ) as string[];

      if (periodIds.length > 0) {
        const closedCount = await manager
          .getRepository(PayPeriod)
          .createQueryBuilder('pp')
          .where('pp.id IN (:...ids)', { ids: periodIds })
          .andWhere('pp.status = :status', { status: PayPeriodStatus.CLOSED })
          .getCount();

        if (closedCount > 0) {
          throw new BadRequestException('Cannot delete payments from a closed pay period.');
        }
      }

      const result = await repo.delete(ids);
      return { deletedCount: result.affected ?? 0 };
    });
  }

  async getPaymentsForPeriod(periodId: string): Promise<SalaryPaymentResponseDto[]> {
    const repo = this.dataSource.getRepository(SalaryPayment);
    const payments = await repo.find({
      where: { payPeriodId: periodId },
      order: { createdAt: 'ASC' },
    });
    return payments.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      payPeriodId: p.payPeriodId,
      amountMinor: p.amountMinor,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      paidOn: p.paidOn,
      note: p.note,
      paidBy: p.paidBy,
      createdAt: p.createdAt,
    }));
  }

  private toResponse(period: PayPeriod): PayPeriodResponseDto {
    return {
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      closedAt: period.closedAt,
      closedBy: period.closedBy,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }
}
