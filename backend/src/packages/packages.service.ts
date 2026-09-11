import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Package } from './package.entity';
import { PackageItem } from './package-item.entity';
import { PackageItemKind } from './package-item-kind.enum';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { CreatePackageDto, CreatePackageItemDto } from './dto/create-package.dto';
import { PackageItemResponseDto, PackageResponseDto } from './dto/package-response.dto';

interface ResolvedItem {
  kind: PackageItemKind;
  serviceId: string | null;
  productId: string | null;
  itemName: string;
  snapshotPriceMinor: number;
}

@Injectable()
export class PackagesService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Creates a new package along with its items.
   *
   * The normal price and savings are computed server-side from current
   * service and product prices. Client-supplied prices for these fields
   * are ignored and cannot be trusted.
   *
   * All writes happen inside a single database transaction. If any item
   * fails validation, no rows are written.
   *
   * @throws BadRequestException if any item is invalid, inactive, or if
   *   the package price exceeds the computed normal price.
   * @throws ConflictException if a package with the same name exists.
   */
  async create(dto: CreatePackageDto): Promise<PackageResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A package must contain at least one item');
    }

    return await this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(Package);
      const itemRepo = manager.getRepository(PackageItem);
      const productRepo = manager.getRepository(Product);
      const serviceRepo = manager.getRepository(SalonService);

      const existing = await packageRepo.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A package with this name already exists');
      }

      const resolvedItems = await this.resolveItems(dto.items, productRepo, serviceRepo);

      const normalPriceMinor = resolvedItems.reduce(
        (sum, item) => sum + item.snapshotPriceMinor,
        0,
      );

      if (normalPriceMinor <= 0) {
        throw new BadRequestException('Computed normal price must be positive');
      }

      if (dto.packagePriceMinor > normalPriceMinor) {
        throw new BadRequestException(
          'Package price cannot exceed the normal price of its components',
        );
      }

      const savingsMinor = normalPriceMinor - dto.packagePriceMinor;

      const packageEntity = packageRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        normalPriceMinor,
        packagePriceMinor: dto.packagePriceMinor,
        savingsMinor,
        active: dto.active ?? true,
      });

      const savedPackage = await packageRepo.save(packageEntity);

      const itemEntities = resolvedItems.map((resolved) =>
        itemRepo.create({
          packageId: savedPackage.id,
          itemKind: resolved.kind,
          serviceId: resolved.serviceId,
          productId: resolved.productId,
          snapshotPriceMinor: resolved.snapshotPriceMinor,
        }),
      );

      const savedItems = await itemRepo.save(itemEntities);

      return this.toResponseDto(savedPackage, savedItems, resolvedItems);
    });
  }

  async findAll(): Promise<PackageResponseDto[]> {
    const packageRepo = this.dataSource.getRepository(Package);
    const itemRepo = this.dataSource.getRepository(PackageItem);

    const packages = await packageRepo.find({
      order: { createdAt: 'DESC' },
    });

    const results: PackageResponseDto[] = [];
    for (const pkg of packages) {
      const items = await itemRepo.find({ where: { packageId: pkg.id } });
      const resolved = await this.hydrateItemNames(items);
      results.push(this.toResponseDto(pkg, items, resolved));
    }
    return results;
  }

  async findActive(): Promise<PackageResponseDto[]> {
    const all = await this.findAll();
    return all.filter((pkg) => pkg.active);
  }

  async findById(id: string): Promise<PackageResponseDto> {
    const packageRepo = this.dataSource.getRepository(Package);
    const itemRepo = this.dataSource.getRepository(PackageItem);

    const pkg = await packageRepo.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const items = await itemRepo.find({ where: { packageId: pkg.id } });
    const resolved = await this.hydrateItemNames(items);
    return this.toResponseDto(pkg, items, resolved);
  }

  /**
   * Resolves each package item to its current entity, capturing the
   * current price for snapshot purposes.
   */
  private async resolveItems(
    items: CreatePackageItemDto[],
    productRepo: ReturnType<DataSource['getRepository']> & any,
    serviceRepo: ReturnType<DataSource['getRepository']> & any,
  ): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const key = `${item.itemKind}:${item.itemId}`;
      if (seen.has(key)) {
        throw new BadRequestException('Duplicate item in package definition');
      }
      seen.add(key);

      if (item.itemKind === PackageItemKind.SERVICE) {
        const service = await serviceRepo.findOne({
          where: { id: item.itemId },
        });
        if (!service) {
          throw new BadRequestException(`Service not found: ${item.itemId}`);
        }
        if (!service.active) {
          throw new BadRequestException(
            `Service is inactive and cannot be added to a package: ${service.name}`,
          );
        }
        resolved.push({
          kind: PackageItemKind.SERVICE,
          serviceId: service.id,
          productId: null,
          itemName: service.name,
          snapshotPriceMinor: service.priceMinor,
        });
      } else {
        const product = await productRepo.findOne({
          where: { id: item.itemId },
        });
        if (!product) {
          throw new BadRequestException(`Product not found: ${item.itemId}`);
        }
        resolved.push({
          kind: PackageItemKind.PRODUCT,
          serviceId: null,
          productId: product.id,
          itemName: product.name,
          snapshotPriceMinor: product.sellingPriceMinor,
        });
      }
    }

    return resolved;
  }

  /**
   * Fills in human-readable names for items loaded from the database.
   * Fetches services and products in bulk.
   */
  private async hydrateItemNames(items: PackageItem[]): Promise<Map<string, string>> {
    const serviceIds = items.filter((i) => i.serviceId).map((i) => i.serviceId as string);
    const productIds = items.filter((i) => i.productId).map((i) => i.productId as string);

    const names = new Map<string, string>();

    if (serviceIds.length > 0) {
      const serviceRepo = this.dataSource.getRepository(SalonService);
      const services = await serviceRepo
        .createQueryBuilder('s')
        .where('s.id IN (:...ids)', { ids: serviceIds })
        .getMany();
      for (const s of services) names.set(s.id, s.name);
    }

    if (productIds.length > 0) {
      const productRepo = this.dataSource.getRepository(Product);
      const products = await productRepo
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      for (const p of products) names.set(p.id, p.name);
    }

    return names;
  }

  private toResponseDto(
    pkg: Package,
    items: PackageItem[],
    resolved: ResolvedItem[] | Map<string, string>,
  ): PackageResponseDto {
    const itemResponses: PackageItemResponseDto[] = items.map((item, idx) => {
      let itemId: string;
      let itemName: string;

      if (item.serviceId) {
        itemId = item.serviceId;
      } else {
        itemId = item.productId as string;
      }

      if (resolved instanceof Map) {
        itemName = resolved.get(itemId) ?? 'Unknown';
      } else {
        itemName = resolved[idx]?.itemName ?? 'Unknown';
      }

      return {
        id: item.id,
        itemKind: item.itemKind,
        itemId,
        itemName,
        snapshotPriceMinor: item.snapshotPriceMinor,
      };
    });

    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      normalPriceMinor: pkg.normalPriceMinor,
      packagePriceMinor: pkg.packagePriceMinor,
      savingsMinor: pkg.savingsMinor,
      active: pkg.active,
      items: itemResponses,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    };
  }
}
