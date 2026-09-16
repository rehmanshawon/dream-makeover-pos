import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonService } from './service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CategoryKind } from '../categories/category-kind.enum';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class SalonServicesService {
  constructor(
    @InjectRepository(SalonService)
    private readonly serviceRepository: Repository<SalonService>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const category = await this.resolveCategory(dto.categoryId);
    const service = this.serviceRepository.create({
      name: dto.name,
      categoryId: category.id,
      priceMinor: dto.priceMinor,
      durationMinutes: dto.durationMinutes,
      rewardPointWeight: dto.rewardPointWeight,
      active: dto.active ?? true,
    });

    const saved = await this.serviceRepository.save(service);
    return this.toResponseDto(saved, category.name);
  }

  async findAll(): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      order: { name: 'ASC' },
    });
    return this.toResponseList(services);
  }

  async findActive(): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
    return this.toResponseList(services);
  }

  async findById(id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const map = await this.categoriesService.loadByIds([service.categoryId]);
    const category = map.get(service.categoryId);
    if (!category) throw new NotFoundException('Category not found');
    return this.toResponseDto(service, category.name);
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

    let categoryName: string | null = null;
    if (dto.categoryId !== undefined) {
      const category = await this.resolveCategory(dto.categoryId);
      service.categoryId = category.id;
      categoryName = category.name;
    }

    const saved = await this.serviceRepository.save(service);
    if (categoryName === null) {
      const map = await this.categoriesService.loadByIds([saved.categoryId]);
      categoryName = map.get(saved.categoryId)?.name ?? 'Unknown';
    }
    return this.toResponseDto(saved, categoryName ?? 'Unknown');
  }

  private async resolveDefaultServiceCategory(): Promise<{ id: string; name: string }> {
    const category = await this.categoriesService.findBySlug('services', CategoryKind.SERVICE);
    if (!category) {
      throw new Error('Default Services category is missing');
    }
    return { id: category.id, name: category.name };
  }

  private async resolveCategory(categoryId?: string): Promise<{ id: string; name: string }> {
    if (!categoryId) return this.resolveDefaultServiceCategory();

    const map = await this.categoriesService.loadByIds([categoryId]);
    const category = map.get(categoryId);
    if (!category) {
      throw new BadRequestException('Unknown service category');
    }
    return { id: category.id, name: category.name };
  }

  private async toResponseList(services: SalonService[]): Promise<ServiceResponseDto[]> {
    if (services.length === 0) return [];
    const map = await this.categoriesService.loadByIds(
      services.map((service) => service.categoryId),
    );
    return services.map((service) =>
      this.toResponseDto(service, map.get(service.categoryId)?.name ?? 'Unknown'),
    );
  }

  private toResponseDto(service: SalonService, categoryName: string): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      category: categoryName,
      priceMinor: service.priceMinor,
      durationMinutes: service.durationMinutes,
      rewardPointWeight: service.rewardPointWeight,
      active: service.active,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
