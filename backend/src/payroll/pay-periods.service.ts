import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { PayPeriod } from './pay-period.entity';
import { PayPeriodStatus } from './pay-period-status.enum';
import { CreatePayPeriodDto } from './dto/create-pay-period.dto';
import { UpdatePayPeriodDto } from './dto/update-pay-period.dto';
import { PayPeriodResponseDto } from './dto/pay-period-response.dto';
import { PayableEmployeeDto } from './dto/payable-employee.dto';
import { RunPayrollResponseDto } from './dto/run-payroll-response.dto';
import { Employee } from '../employees/employee.entity';
//import { EmployeeStatus } from '../employees/employee-status.enum';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../salary-payments/payment-method.enum';

@Injectable()
export class PayPeriodsService {
  constructor(
    @InjectRepository(PayPeriod)
    private readonly periodRepository: Repository<PayPeriod>,
    private readonly dataSource: DataSource,
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

    return employees.map((e) => {
      const payableMinor = this.computePayable(e, period);
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
    });
  }

  async create(dto: CreatePayPeriodDto): Promise<PayPeriodResponseDto> {
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }
    await this.assertNoOverlap(dto.startDate, dto.endDate, null);

    const period = this.periodRepository.create({
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: PayPeriodStatus.OPEN,
    });
    const saved = await this.periodRepository.save(period);
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdatePayPeriodDto): Promise<PayPeriodResponseDto> {
    const period = await this.periodRepository.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Pay period not found');
    if (period.status === PayPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot edit a closed pay period');
    }
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }
    await this.assertNoOverlap(dto.startDate, dto.endDate, id);

    period.name = dto.name;
    period.startDate = dto.startDate;
    period.endDate = dto.endDate;
    const saved = await this.periodRepository.save(period);
    return this.toResponse(saved);
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
        const payableMinor = this.computePayable(e, period);
        if (payableMinor <= 0) {
          skippedCount += 1;
          continue;
        }

        const payment = paymentRepo.create({
          employeeId: e.id,
          payPeriodId: periodId,
          amountMinor: payableMinor,
          paymentType: SalaryPaymentType.REGULAR,
          paymentMethod: PaymentMethod.CASH,
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
  private computePayable(employee: Employee, period: PayPeriod): number {
    const frequencyDays =
      employee.salaryFrequency === 'MONTHLY' ? 30 : employee.salaryFrequency === 'WEEKLY' ? 7 : 1;
    const dailyRate = employee.salaryMinor / frequencyDays;

    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    const joinDate = new Date(employee.joinDate);

    const effectiveStart = joinDate > periodStart ? joinDate : periodStart;
    const effectiveEnd = periodEnd;

    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(
      0,
      Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1,
    );
    return Math.round(dailyRate * days);
  }

  private async assertNoOverlap(
    startDate: string,
    endDate: string,
    excludeId: string | null,
  ): Promise<void> {
    const where: Record<string, unknown> = {
      startDate: LessThanOrEqual(endDate),
      endDate: MoreThanOrEqual(startDate),
    };
    if (excludeId) where.id = Not(excludeId);
    const conflict = await this.periodRepository.findOne({ where });
    if (conflict) {
      throw new ConflictException(`Pay period overlaps with existing period: ${conflict.name}`);
    }
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
