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
import { CreateSalaryPaymentDto } from '../salary-payments/dto/create-salary-payment.dto';
import { AdjustAdvanceDto } from './dto/adjust-advance.dto';
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../salary-payments/payment-method.enum';
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

  async ensurePeriodExists(year: number, month: number): Promise<PayPeriod> {
    const existing = await this.periodRepository.findOne({ where: { year, month } });
    if (existing) return existing;

    try {
      return await this.periodRepository.save(
        this.periodRepository.create({
          year,
          month,
          name: nameFor(year, month),
          startDate: startOf(year, month),
          endDate: endOf(year, month),
          status: PayPeriodStatus.OPEN,
        }),
      );
    } catch (error) {
      // Another application instance may have inserted this month concurrently.
      const createdByOtherInstance = await this.periodRepository.findOne({
        where: { year, month },
      });
      if (createdByOtherInstance) return createdByOtherInstance;
      throw error;
    }
  }

  async ensureMissingPeriodsThrough(year: number, month: number): Promise<void> {
    const periods = await this.periodRepository.find({
      order: { year: 'ASC', month: 'ASC' },
    });
    const startingPeriod = periods.find(
      (period) => period.year < year || (period.year === year && period.month <= month),
    );

    if (!startingPeriod) {
      await this.ensurePeriodExists(year, month);
      return;
    }

    let cursorYear = startingPeriod.year;
    let cursorMonth = startingPeriod.month;
    while (cursorYear < year || (cursorYear === year && cursorMonth <= month)) {
      await this.ensurePeriodExists(cursorYear, cursorMonth);
      if (cursorMonth === 12) {
        cursorYear += 1;
        cursorMonth = 1;
      } else {
        cursorMonth += 1;
      }
    }
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

    const priorPeriods = await this.periodRepository.find({
      where: { endDate: LessThanOrEqual(period.endDate) },
      order: { endDate: 'ASC' },
    });
    const payments = await paymentRepo.find({
      where: {},
    });

    return Promise.all(
      employees.map(async (e) => {
        const obligations = await Promise.all(
          priorPeriods.map((candidate) => this.computePayable(e, candidate)),
        );
        const balances = this.calculateBalances(e.id, period, priorPeriods, obligations, payments);
        const totalDueMinor = balances.salaryDueMinor;
        const currentObligationMinor = obligations[obligations.length - 1] ?? 0;
        const alreadyPaidMinor = payments
          .filter(
            (payment) =>
              payment.employeeId === e.id &&
              payment.payPeriodId === periodId &&
              payment.paymentType === SalaryPaymentType.REGULAR,
          )
          .reduce((sum, payment) => sum + payment.amountMinor, 0);
        const carriedArrearsMinor = Math.max(0, totalDueMinor - currentObligationMinor);
        const remainingMinor = balances.netDueMinor;
        return {
          employeeId: e.id,
          employeeName: e.fullName,
          role: e.role,
          monthlySalaryMinor: e.salaryMinor,
          payableMinor: currentObligationMinor,
          currentObligationMinor,
          carriedArrearsMinor,
          totalDueMinor,
          advanceMinor: balances.advanceMinor,
          alreadyPaidMinor,
          remainingMinor,
          hasExistingPayment: alreadyPaidMinor > 0,
        };
      }),
    );
  }

  async createSalaryPayment(
    periodId: string,
    dto: CreateSalaryPaymentDto,
    paidBy: string,
  ): Promise<SalaryPaymentResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot record salary payments in a closed period');
    }
    if (dto.amountMinor <= 0) throw new BadRequestException('Payment amount must be positive');
    this.validateDisbursementDetails(dto.paymentMethod ?? PaymentMethod.CASH, dto);

    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { id: dto.employeeId },
    });
    if (!employee || new Date(employee.joinDate) > new Date(period.endDate)) {
      throw new BadRequestException('Employee is not eligible for this pay period');
    }

    const periods = await this.periodRepository.find({
      where: { endDate: LessThanOrEqual(period.endDate) },
      order: { endDate: 'ASC' },
    });
    const payments = await this.dataSource.getRepository(SalaryPayment).find({
      where: { employeeId: employee.id },
    });
    const obligations = await Promise.all(
      periods.map((candidate) => this.computePayable(employee, candidate)),
    );
    const balances = this.calculateBalances(employee.id, period, periods, obligations, payments);
    if (dto.amountMinor > balances.netDueMinor) {
      throw new BadRequestException(
        `Payment cannot exceed remaining salary due (${balances.netDueMinor})`,
      );
    }

    const payment = this.dataSource.getRepository(SalaryPayment).create({
      ...dto,
      payPeriodId: periodId,
      paymentType: SalaryPaymentType.REGULAR,
      note: dto.note ?? (dto.amountMinor < balances.netDueMinor ? 'Salary partially paid.' : null),
      paidBy,
    });
    const saved = await this.dataSource.getRepository(SalaryPayment).save(payment);
    return this.toPaymentResponse(saved);
  }

  async adjustAdvance(
    periodId: string,
    employeeId: string,
    dto: AdjustAdvanceDto,
    paidBy: string,
  ): Promise<SalaryPaymentResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot adjust advances in a closed period');
    }

    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const periods = await this.periodRepository.find({
      where: { endDate: LessThanOrEqual(period.endDate) },
      order: { endDate: 'ASC' },
    });
    const payments = await this.dataSource.getRepository(SalaryPayment).find({
      where: { employeeId },
    });
    const obligations = await Promise.all(
      periods.map((candidate) => this.computePayable(employee, candidate)),
    );
    const balances = this.calculateBalances(employeeId, period, periods, obligations, payments);
    if (dto.amountMinor > balances.advanceMinor) {
      throw new BadRequestException(
        `Adjustment cannot exceed outstanding advance (${balances.advanceMinor})`,
      );
    }

    const adjustment = this.dataSource.getRepository(SalaryPayment).create({
      employeeId,
      payPeriodId: periodId,
      amountMinor: dto.amountMinor,
      paymentType: SalaryPaymentType.ADVANCE_ADJUSTMENT,
      paymentMethod: PaymentMethod.CASH,
      paidOn: period.endDate,
      note: 'Advance adjusted from salary.',
      paidBy,
    });
    const saved = await this.dataSource.getRepository(SalaryPayment).save(adjustment);
    return this.toPaymentResponse(saved);
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

      const currentPeriodPayments = await paymentRepo.find({
        where: {
          payPeriodId: periodId,
          paymentType: SalaryPaymentType.REGULAR,
        },
      });
      const employeesPaidThisPeriod = new Set(
        currentPeriodPayments.map((payment) => payment.employeeId),
      );

      const created: Array<{
        id: string;
        employeeId: string;
        employeeName: string;
        amountMinor: number;
      }> = [];
      let skippedCount = 0;
      let totalPaidMinor = 0;

      for (const e of employees) {
        if (employeesPaidThisPeriod.has(e.id)) {
          skippedCount += 1;
          continue;
        }
        const periods = await this.periodRepository.find({
          where: { endDate: LessThanOrEqual(period.endDate) },
          order: { endDate: 'ASC' },
        });
        const payments = await paymentRepo.find({ where: { employeeId: e.id } });
        const obligations = await Promise.all(
          periods.map((candidate) => this.computePayable(e, candidate)),
        );
        const balances = this.calculateBalances(e.id, period, periods, obligations, payments);
        const payableMinor = balances.netDueMinor;
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
        const hasAdvanceAdjustmentThisPeriod = payments.some(
          (payment) =>
            payment.payPeriodId === periodId &&
            payment.paymentType === SalaryPaymentType.ADVANCE_ADJUSTMENT,
        );
        if (balances.advanceMinor > 0 && !hasAdvanceAdjustmentThisPeriod) {
          await paymentRepo.save(
            paymentRepo.create({
              employeeId: e.id,
              payPeriodId: periodId,
              amountMinor: balances.advanceMinor,
              paymentType: SalaryPaymentType.ADVANCE_ADJUSTMENT,
              paymentMethod: PaymentMethod.CASH,
              paidOn: period.endDate,
              note: 'Advance adjusted from salary.',
              paidBy: cashier,
            }),
          );
        }
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
      const payableDays =
        employee.salaryFrequency === 'MONTHLY'
          ? Math.max(0, Math.min(30, 30 - (recordedDays - workedDays)))
          : workedDays;
      return Math.round(dailyRate * payableDays);
    }

    if (employee.salaryFrequency === 'MONTHLY') {
      const joinDay = joinDate > periodStart ? joinDate.getDate() : 1;
      const fixedMonthDays = Math.max(0, 30 - joinDay + 1);
      return Math.round(dailyRate * fixedMonthDays);
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

  private calculateBalances(
    employeeId: string,
    period: PayPeriod,
    periods: PayPeriod[],
    obligations: number[],
    payments: SalaryPayment[],
  ): { salaryDueMinor: number; advanceMinor: number; netDueMinor: number } {
    const employeePayments = payments.filter((payment) => payment.employeeId === employeeId);
    const regularPayments = payments.filter(
      (payment) =>
        payment.employeeId === employeeId && payment.paymentType === SalaryPaymentType.REGULAR,
    );
    const salaryDueMinor = Math.max(
      0,
      obligations.reduce((sum, amount) => sum + amount, 0) -
        regularPayments.reduce((sum, payment) => sum + payment.amountMinor, 0),
    );
    const explicitAdvanceMinor = employeePayments
      .filter(
        (payment) =>
          payment.paymentType === SalaryPaymentType.ADVANCE && payment.paidOn < period.startDate,
      )
      .reduce((sum, payment) => sum + payment.amountMinor, 0);
    const adjustmentMinor = employeePayments
      .filter(
        (payment) =>
          payment.paymentType === SalaryPaymentType.ADVANCE_ADJUSTMENT &&
          payment.payPeriodId !== null &&
          periods.some((candidate) => candidate.id === payment.payPeriodId),
      )
      .reduce((sum, payment) => sum + payment.amountMinor, 0);
    const currentAdjustmentMinor = employeePayments
      .filter(
        (payment) =>
          payment.payPeriodId === period.id &&
          payment.paymentType === SalaryPaymentType.ADVANCE_ADJUSTMENT,
      )
      .reduce((sum, payment) => sum + payment.amountMinor, 0);
    let cumulativeObligation = 0;
    let cumulativeRegular = 0;
    let overpaymentMinor = 0;
    for (let index = 0; index < periods.length; index += 1) {
      cumulativeObligation += obligations[index] ?? 0;
      cumulativeRegular += regularPayments
        .filter((payment) => payment.payPeriodId === periods[index]?.id)
        .reduce((sum, payment) => sum + payment.amountMinor, 0);
      overpaymentMinor = Math.max(overpaymentMinor, cumulativeRegular - cumulativeObligation);
    }
    const advanceMinor = Math.max(0, explicitAdvanceMinor + overpaymentMinor - adjustmentMinor);
    const currentAdvanceDeductionMinor =
      currentAdjustmentMinor > 0 ? currentAdjustmentMinor : advanceMinor;
    return {
      salaryDueMinor,
      advanceMinor,
      netDueMinor: Math.max(0, salaryDueMinor - currentAdvanceDeductionMinor),
    };
  }

  private toPaymentResponse(payment: SalaryPayment): SalaryPaymentResponseDto {
    return {
      id: payment.id,
      employeeId: payment.employeeId,
      payPeriodId: payment.payPeriodId,
      amountMinor: payment.amountMinor,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      paidOn: payment.paidOn,
      note: payment.note,
      bonusType: payment.bonusType,
      overtimeHours: payment.overtimeHours,
      overtimeDate: payment.overtimeDate,
      checkNumber: payment.checkNumber,
      bankAccountNumber: payment.bankAccountNumber,
      mobileWalletProvider: payment.mobileWalletProvider,
      mobileWalletNumber: payment.mobileWalletNumber,
      paidBy: payment.paidBy,
      createdAt: payment.createdAt,
    };
  }

  private validateDisbursementDetails(method: PaymentMethod, dto: CreateSalaryPaymentDto): void {
    if (method === PaymentMethod.BANK && !dto.checkNumber && !dto.bankAccountNumber) {
      throw new BadRequestException('Bank payments require a check number or bank account number.');
    }
    if (method === PaymentMethod.MOBILE && (!dto.mobileWalletProvider || !dto.mobileWalletNumber)) {
      throw new BadRequestException('Mobile payments require a wallet provider and wallet number.');
    }
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

      const containsPayrollPayment = payments.some(
        (payment) =>
          payment.payPeriodId !== null ||
          ![
            SalaryPaymentType.BONUS,
            SalaryPaymentType.OVERTIME,
            SalaryPaymentType.ADVANCE,
          ].includes(payment.paymentType),
      );
      if (containsPayrollPayment) {
        throw new BadRequestException(
          'Payroll salary payments and advance adjustments cannot be deleted.',
        );
      }

      const result = await repo.delete(ids);
      return { deletedCount: result.affected ?? 0 };
    });
  }

  async delete(id: string): Promise<void> {
    const period = await this.periodRepository.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot delete a closed pay period.');
    }

    const paymentRepo = this.dataSource.getRepository(SalaryPayment);
    const payment = await paymentRepo.findOne({ where: { payPeriodId: id } });
    if (payment) {
      throw new BadRequestException('Cannot delete a pay period with recorded payments.');
    }

    await this.periodRepository.delete(id);
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
      bonusType: p.bonusType,
      overtimeHours: p.overtimeHours,
      overtimeDate: p.overtimeDate,
      checkNumber: p.checkNumber,
      bankAccountNumber: p.bankAccountNumber,
      mobileWalletProvider: p.mobileWalletProvider,
      mobileWalletNumber: p.mobileWalletNumber,
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
