import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonService } from './service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';

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
