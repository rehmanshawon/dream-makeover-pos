import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonServicesService } from '../src/services/salon-services.service';
import { SalonService } from '../src/services/service.entity';
import { CreateServiceDto } from '../src/services/dto/create-service.dto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('SalonServicesService', () => {
  let service: SalonServicesService;
  let repository: Repository<SalonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonServicesService,
        {
          provide: getRepositoryToken(SalonService),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SalonServicesService);
    repository = module.get(getRepositoryToken(SalonService));
  });

  it('should create active service by default', async () => {
    const dto: CreateServiceDto = {
      name: 'Bridal Facial',
      priceMinor: 350000,
      durationMinutes: 60,
      rewardPointWeight: 1,
    };

    jest.spyOn(repository, 'create').mockReturnValue({
      ...dto,
      active: true,
    } as unknown as SalonService);

    jest.spyOn(repository, 'save').mockResolvedValue({
      id: 'uuid-service-1',
      ...dto,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SalonService);

    const result = await service.create(dto);

    expect(result.active).toBe(true);
    expect(result.priceMinor).toBe(350000);
  });

  it('should find only active services when requested', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([
      {
        id: 'uuid-active-1',
        name: 'Hair Spa',
        priceMinor: 200000,
        durationMinutes: 45,
        rewardPointWeight: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SalonService,
    ]);

    const result = await service.findActive();
    expect(result).toHaveLength(1);
    expect(result[0]?.active).toBe(true);
  });
});
