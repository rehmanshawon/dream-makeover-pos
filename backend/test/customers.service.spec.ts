import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from '../src/customers/customers.service';
import { Customer } from '../src/customers/customer.entity';
import { CreateCustomerDto } from '../src/customers/dto/create-customer.dto';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: Repository<Customer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CustomersService);
    repository = module.get(getRepositoryToken(Customer));
  });

  it('should reject duplicate phone number', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(new Customer());

    const dto: CreateCustomerDto = {
      fullName: 'Rehman Shawon',
      phoneNumber: '01700000000',
    };

    await expect(service.create(dto)).rejects.toThrow();
  });

  it('should create customer with Silver tier by default', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    jest.spyOn(repository, 'create').mockReturnValue(new Customer());
    jest.spyOn(repository, 'save').mockResolvedValue({
      id: 'uuid-1',
      fullName: 'Rehman Shawon',
      phoneNumber: '01700000000',
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Customer);

    const dto: CreateCustomerDto = {
      fullName: 'Rehman Shawon',
      phoneNumber: '01700000000',
    };

    const result = await service.create(dto);
    expect(result.rewardTier).toBe(CustomerRewardTier.SILVER);
    expect(result.rewardPoints).toBe(0);
  });
});
