import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SalonServicesService } from '../src/services/salon-services.service';
import { SalonService } from '../src/services/service.entity';
import { CreateServiceDto } from '../src/services/dto/create-service.dto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('SalonServicesService', () => {
  let service: SalonServicesService;
  let repository: MockRepository<SalonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonServicesService,
        {
          provide: getRepositoryToken(SalonService),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SalonServicesService>(SalonServicesService);
    repository = module.get(getRepositoryToken(SalonService));
  });

  describe('create', () => {
    it('should default active to true when not provided in DTO', async () => {
      const dto: CreateServiceDto = {
        name: 'Bridal Facial',
        priceMinor: 350000,
        durationMinutes: 60,
        rewardPointWeight: 1,
      };

      const mockSavedService = {
        id: 'uuid-service-1',
        ...dto,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SalonService;

      repository.create.mockReturnValue(mockSavedService);
      repository.save.mockResolvedValue(mockSavedService);

      const result = await service.create(dto);

      // Verifies that dto.active ?? true evaluates correctly and passes to TypeORM
      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        priceMinor: dto.priceMinor,
        durationMinutes: dto.durationMinutes,
        rewardPointWeight: dto.rewardPointWeight,
        active: true,
      });
      expect(repository.save).toHaveBeenCalledWith(mockSavedService);
      expect(result.id).toBe('uuid-service-1');
      expect(result.active).toBe(true);
    });

    it('should respect explicitly provided active: false in DTO', async () => {
      const dto: CreateServiceDto = {
        name: 'Seasonal Hair Color',
        priceMinor: 500000,
        durationMinutes: 90,
        rewardPointWeight: 2,
        active: false,
      };

      const mockSavedService = {
        id: 'uuid-service-2',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SalonService;

      repository.create.mockReturnValue(mockSavedService);
      repository.save.mockResolvedValue(mockSavedService);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('findAll', () => {
    it('should fetch all services ordered by name ASC', async () => {
      const mockServices = [
        {
          id: 'uuid-1',
          name: 'Bridal Facial',
          priceMinor: 100000,
          durationMinutes: 60,
          rewardPointWeight: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as SalonService,
      ];

      repository.find.mockResolvedValue(mockServices);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].priceMinor).toBe(100000);
    });
  });

  describe('findActive', () => {
    it('should query services filtered by active: true and ordered by name ASC', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findActive();

      expect(repository.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return service DTO when found', async () => {
      const mockService = {
        id: 'uuid-1',
        name: 'Pedicure',
        priceMinor: 150000,
        durationMinutes: 45,
        rewardPointWeight: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SalonService;

      repository.findOne.mockResolvedValue(mockService);

      const result = await service.findById('uuid-1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Pedicure');
    });

    it('should throw NotFoundException when service does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
