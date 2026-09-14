import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerTransactionDto, CustomerTransactionItemDto } from './dto/customer-transaction.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CustomerRewardTier } from './customer-reward-tier.enum';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const existing = await this.customerRepository.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existing) {
      throw new ConflictException('A customer with this phone number already exists');
    }

    const customer = this.customerRepository.create({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
    });

    const saved = await this.customerRepository.save(customer);
    return this.toResponseDto(saved);
  }

  /**
   * Updates an existing customer's fullName and/or phoneNumber.
   *
   * Loyalty fields are not editable. They are derived from transactions
   * and are only updated by the checkout engine.
   */
  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.phoneNumber !== undefined && dto.phoneNumber !== customer.phoneNumber) {
      const existing = await this.customerRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing && existing.id !== customer.id) {
        throw new ConflictException('A customer with this phone number already exists');
      }
      customer.phoneNumber = dto.phoneNumber;
    }

    if (dto.fullName !== undefined) {
      customer.fullName = dto.fullName;
    }

    const saved = await this.customerRepository.save(customer);
    return this.toResponseDto(saved);
  }

  /**
   * Returns the purchase history for a customer, newest first.
   */
  async findTransactions(customerId: string): Promise<CustomerTransactionDto[]> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const transactionRepo = this.dataSource.getRepository(Transaction);
    const itemRepo = this.dataSource.getRepository(TransactionItem);

    const transactions = await transactionRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    if (transactions.length === 0) return [];

    const transactionIds = transactions.map((t) => t.id);
    const items = await itemRepo
      .createQueryBuilder('item')
      .where('item.transaction_id IN (:...ids)', { ids: transactionIds })
      .getMany();

    // Group items by transaction ID for fast lookup
    const itemsByTransaction = new Map<string, TransactionItem[]>();
    for (const item of items) {
      const list = itemsByTransaction.get(item.transactionId) ?? [];
      list.push(item);
      itemsByTransaction.set(item.transactionId, list);
    }

    return transactions.map((tx) => this.toTransactionDto(tx, itemsByTransaction.get(tx.id) ?? []));
  }

  private toTransactionDto(tx: Transaction, items: TransactionItem[]): CustomerTransactionDto {
    return {
      id: tx.id,
      invoiceId: tx.invoiceId,
      createdAt: tx.createdAt,
      subtotalMinor: tx.subtotalMinor,
      discountMinor: tx.discountMinor,
      totalMinor: tx.totalMinor,
      cashier: tx.cashier,
      items: items.map((item) => this.toTransactionItemDto(item)),
    };
  }

  private toTransactionItemDto(item: TransactionItem): CustomerTransactionItemDto {
    return {
      itemType: item.itemType,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalPriceMinor: item.totalPriceMinor,
    };
  }

  async findAll(): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.find({
      order: { createdAt: 'DESC' },
    });
    return customers.map((customer) => this.toResponseDto(customer));
  }

  async findById(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return this.toResponseDto(customer);
  }

  private toResponseDto(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      rewardTier: customer.rewardTier,
      rewardPoints: customer.rewardPoints,
      lifetimeSpendMinor: customer.lifetimeSpendMinor,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
