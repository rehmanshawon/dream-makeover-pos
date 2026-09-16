import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { CategoriesService } from '../categories/categories.service';
import { CategoryKind } from '../categories/category-kind.enum';

export interface ProductResponseOptions {
  includePurchaseCost: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    dto: CreateProductDto,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto> {
    const category = await this.resolveCategory(dto.category);

    const product = this.productRepository.create({
      name: dto.name,
      categoryId: category.id,
      stock: dto.stock,
      purchaseCostMinor: dto.purchaseCostMinor,
      sellingPriceMinor: dto.sellingPriceMinor,
      minimumStockThreshold: dto.minimumStockThreshold,
    });

    const saved = await this.productRepository.save(product);
    return this.toResponseDto(saved, category.name, category.id, options);
  }

  async findAll(options: ProductResponseOptions): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      order: { name: 'ASC' },
    });
    return this.toResponseList(products, options);
  }

  async findByCategory(
    categorySlug: string,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto[]> {
    const category = await this.categoriesService.findBySlug(categorySlug, CategoryKind.PRODUCT);
    if (!category) {
      throw new NotFoundException(`Category not found: ${categorySlug}`);
    }

    const products = await this.productRepository.find({
      where: { categoryId: category.id },
      order: { name: 'ASC' },
    });
    return this.toResponseList(products, options);
  }

  async findById(id: string, options: ProductResponseOptions): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const map = await this.categoriesService.loadByIds([product.categoryId]);
    const category = map.get(product.categoryId);
    if (!category) throw new NotFoundException('Category not found');
    return this.toResponseDto(product, category.name, category.id, options);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let categoryName: string | null = null;
    let categoryId = product.categoryId;

    if (dto.category !== undefined) {
      const category = await this.resolveCategory(dto.category);
      product.categoryId = category.id;
      categoryName = category.name;
      categoryId = category.id;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.purchaseCostMinor !== undefined) {
      product.purchaseCostMinor = dto.purchaseCostMinor;
    }
    if (dto.sellingPriceMinor !== undefined) {
      product.sellingPriceMinor = dto.sellingPriceMinor;
    }
    if (dto.minimumStockThreshold !== undefined) {
      product.minimumStockThreshold = dto.minimumStockThreshold;
    }

    const saved = await this.productRepository.save(product);

    if (categoryName === null) {
      const map = await this.categoriesService.loadByIds([categoryId]);
      const c = map.get(categoryId);
      categoryName = c?.name ?? 'Unknown';
    }

    return this.toResponseDto(saved, categoryName, categoryId, options);
  }

  /**
   * Resolves a legacy `category` value (a slug or a name) into a
   * category entity of kind PRODUCT.
   */
  private async resolveCategory(value: string): Promise<{ id: string; name: string }> {
    const slugified = value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const category = await this.categoriesService.findBySlug(slugified, CategoryKind.PRODUCT);
    if (!category) {
      throw new BadRequestException(`Unknown product category: ${value}`);
    }
    return { id: category.id, name: category.name };
  }

  private async toResponseList(
    products: Product[],
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto[]> {
    if (products.length === 0) return [];
    const map = await this.categoriesService.loadByIds(products.map((p) => p.categoryId));
    return products.map((p) => {
      const c = map.get(p.categoryId);
      return this.toResponseDto(p, c?.name ?? 'Unknown', p.categoryId, options);
    });
  }

  private toResponseDto(
    product: Product,
    categoryName: string,
    categoryId: string,
    options: ProductResponseOptions,
  ): ProductResponseDto {
    const dto: ProductResponseDto = {
      id: product.id,
      name: product.name,
      categoryId,
      category: categoryName,
      stock: product.stock,
      sellingPriceMinor: product.sellingPriceMinor,
      minimumStockThreshold: product.minimumStockThreshold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    if (options.includePurchaseCost) {
      dto.purchaseCostMinor = product.purchaseCostMinor;
    }

    return dto;
  }
}
