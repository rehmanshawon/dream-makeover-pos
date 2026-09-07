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

  //Duplicate phone rejected test case

  it('should reject duplicate phone number', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(new Customer());

    const dto: CreateCustomerDto = {
      fullName: 'Rehman Shawon',
      phoneNumber: '01700000000',
    };

    await expect(service.create(dto)).rejects.toThrow();
  });

  //Create customer with Silver tier by default test case

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

  //Additional test cases can be added here

  //Correct data passed to create/save test case
  it('should pass correct data to create and save', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    const createSpy = jest.spyOn(repository, 'create').mockReturnValue(new Customer());
    const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue({
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

    await service.create(dto);
    expect(createSpy).toHaveBeenCalledWith({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
    });
    expect(saveSpy).toHaveBeenCalled();
  });

  // findById → not found test case
  it('should throw an error if customer not found by id', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    await expect(service.findById('non-existent-id')).rejects.toThrow();
  });

  // findById → found test case
  it('should return a customer when found', async () => {
    const customer = {
      id: 'uuid-1',
      fullName: 'Rehman Shawon',
      phoneNumber: '01700000000',
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 100,
      lifetimeSpendMinor: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Customer;

    jest.spyOn(repository, 'findOne').mockResolvedValue(customer);

    const result = await service.findById('uuid-1');

    expect(result).toEqual({
      id: customer.id,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      rewardTier: customer.rewardTier,
      rewardPoints: customer.rewardPoints,
      lifetimeSpendMinor: 50000,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  });

  // findAll -> returns mapped customers test case
  // should return customers ordered by creation date

  it('should return customers ordered by creation date', async () => {
    const customers = [
      {
        id: 'uuid-1',
        fullName: 'Customer 1',
        phoneNumber: '01700000001',
        rewardTier: CustomerRewardTier.SILVER,
        rewardPoints: 0,
        lifetimeSpendMinor: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as Customer[];

    jest.spyOn(repository, 'find').mockResolvedValue(customers);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('uuid-1');
  });
});
