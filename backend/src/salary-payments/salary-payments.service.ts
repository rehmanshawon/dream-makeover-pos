import { Injectable, NotFoundException } from '@nestjs/common';
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
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const payment = this.paymentRepository.create({
      employeeId: employee.id,
      amountMinor: dto.amountMinor,
      paymentType: dto.paymentType ?? SalaryPaymentType.REGULAR,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
      paidOn: dto.paidOn,
      note: dto.note ?? null,
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
    if (!payment) {
      throw new NotFoundException('Salary payment not found');
    }
    await this.paymentRepository.remove(payment);
  }

  private toResponseDto(payment: SalaryPayment): SalaryPaymentResponseDto {
    return {
      id: payment.id,
      employeeId: payment.employeeId,
      amountMinor: payment.amountMinor,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      paidOn: payment.paidOn,
      note: payment.note,
      paidBy: payment.paidBy,
      createdAt: payment.createdAt,
    };
  }
}
