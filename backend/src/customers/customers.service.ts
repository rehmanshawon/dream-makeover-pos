import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CustomerRewardTier } from './customer-reward-tier.enum';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
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
      lifetimeSpendMinor: Number(customer.lifetimeSpendMinor),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
