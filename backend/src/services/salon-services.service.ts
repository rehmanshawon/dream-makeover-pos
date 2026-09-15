import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonService } from './service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class SalonServicesService {
  constructor(
    @InjectRepository(SalonService)
    private readonly serviceRepository: Repository<SalonService>,
  ) {}

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = this.serviceRepository.create({
      name: dto.name,
      priceMinor: dto.priceMinor,
      durationMinutes: dto.durationMinutes,
      rewardPointWeight: dto.rewardPointWeight,
      active: dto.active ?? true,
    });

    const saved = await this.serviceRepository.save(service);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      order: { name: 'ASC' },
    });
    return services.map((service) => this.toResponseDto(service));
  }

  async findActive(): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
    return services.map((service) => this.toResponseDto(service));
  }

  async findById(id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return this.toResponseDto(service);
  }

  /**
   * Partially updates a service.
   *
   * Only fields present in the DTO are modified. Omitted fields remain
   * unchanged. Setting `active` to false effectively deactivates the
   * service, matching the semantics of a soft delete.
   */
  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (dto.name !== undefined) service.name = dto.name;
    if (dto.priceMinor !== undefined) service.priceMinor = dto.priceMinor;
    if (dto.durationMinutes !== undefined) {
      service.durationMinutes = dto.durationMinutes;
    }
    if (dto.rewardPointWeight !== undefined) {
      service.rewardPointWeight = dto.rewardPointWeight;
    }
    if (dto.active !== undefined) service.active = dto.active;

    const saved = await this.serviceRepository.save(service);
    return this.toResponseDto(saved);
  }

  private toResponseDto(service: SalonService): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      priceMinor: service.priceMinor,
      durationMinutes: service.durationMinutes,
      rewardPointWeight: service.rewardPointWeight,
      active: service.active,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
