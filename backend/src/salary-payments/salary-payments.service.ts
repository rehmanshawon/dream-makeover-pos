import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayPeriod } from '../payroll/pay-period.entity';
import { PayPeriodStatus } from '../payroll/pay-period-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryPayment } from './salary-payment.entity';
import { Employee } from '../employees/employee.entity';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { SalaryPaymentResponseDto } from './dto/salary-payment-response.dto';
import { SalaryPaymentType } from './salary-payment-type.enum';
import { PaymentMethod } from './payment-method.enum';

@Injectable()
export class SalaryPaymentsService {
  constructor(
    @InjectRepository(SalaryPayment)
    private readonly paymentRepository: Repository<SalaryPayment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(PayPeriod)
    private readonly payPeriodRepository: Repository<PayPeriod>,
  ) {}

  /**
   * Records a salary payment for an employee.
   *
   * The employee must exist. We do not validate against the employee's
   * configured salary because:
   * - Partial payments are allowed
   * - Bonuses and advances do not match the salary amount
   * - Overtime varies
   *
   * Validation of appropriateness is a business process, not a schema rule.
   */
  async create(dto: CreateSalaryPaymentDto, paidBy: string): Promise<SalaryPaymentResponseDto> {
    const paymentType = dto.paymentType ?? SalaryPaymentType.REGULAR;
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (paymentType === SalaryPaymentType.REGULAR) {
      throw new BadRequestException('Regular salary payments must be recorded from a pay period.');
    }
    this.validateDisbursementDetails(dto.paymentMethod ?? PaymentMethod.CASH, dto);

    const payment = this.paymentRepository.create({
      employeeId: employee.id,
      amountMinor: dto.amountMinor,
      paymentType,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
      paidOn: dto.paidOn,
      note: dto.note ?? null,
      checkNumber: dto.checkNumber ?? null,
      bankAccountNumber: dto.bankAccountNumber ?? null,
      mobileWalletProvider: dto.mobileWalletProvider ?? null,
      mobileWalletNumber: dto.mobileWalletNumber ?? null,
      paidBy,
    });

    const saved = await this.paymentRepository.save(payment);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<SalaryPaymentResponseDto[]> {
    const payments = await this.paymentRepository.find({
      order: { paidOn: 'DESC', createdAt: 'DESC' },
    });
    return payments.map((p) => this.toResponseDto(p));
  }

  async findByEmployee(employeeId: string): Promise<SalaryPaymentResponseDto[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const payments = await this.paymentRepository.find({
      where: { employeeId },
      order: { paidOn: 'DESC', createdAt: 'DESC' },
    });
    return payments.map((p) => this.toResponseDto(p));
  }

  async findById(id: string): Promise<SalaryPaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Salary payment not found');
    }
    return this.toResponseDto(payment);
  }

  /**
   * Deletes a salary payment. This is a deliberate tradeoff:
   *
   * We do not implement reversal entries. A mistaken payment is simply
   * removed. This keeps the workflow simple for a small salon.
   *
   * If audit requirements grow, this method should be replaced with a
   * reversal mechanism. The current API surface allows that change
   * without altering the schema.
   */
  async remove(id: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Salary payment not found');

    if (payment.payPeriodId) {
      const period = await this.payPeriodRepository.findOne({
        where: { id: payment.payPeriodId },
      });
      if (period && period.status === PayPeriodStatus.CLOSED) {
        throw new BadRequestException('Cannot delete payments from a closed pay period.');
      }
    }

    await this.paymentRepository.remove(payment);
  }

  private toResponseDto(payment: SalaryPayment): SalaryPaymentResponseDto {
    return {
      id: payment.id,
      employeeId: payment.employeeId,
      payPeriodId: payment.payPeriodId,
      amountMinor: payment.amountMinor,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      paidOn: payment.paidOn,
      note: payment.note,
      checkNumber: payment.checkNumber,
      bankAccountNumber: payment.bankAccountNumber,
      mobileWalletProvider: payment.mobileWalletProvider,
      mobileWalletNumber: payment.mobileWalletNumber,
      paidBy: payment.paidBy,
      createdAt: payment.createdAt,
    };
  }

  validateDisbursementDetails(method: PaymentMethod, dto: CreateSalaryPaymentDto): void {
    if (method === PaymentMethod.BANK && !dto.checkNumber && !dto.bankAccountNumber) {
      throw new BadRequestException('Bank payments require a check number or bank account number.');
    }
    if (method === PaymentMethod.MOBILE && (!dto.mobileWalletProvider || !dto.mobileWalletNumber)) {
      throw new BadRequestException('Mobile payments require a wallet provider and wallet number.');
    }
  }
}
