import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductCategory } from './product-category.enum';

export interface ProductResponseOptions {
  /**
   * Include purchase cost in the response. Only ADMIN callers should
   * pass true. This is a backend-only concern; the frontend must never
   * be trusted to hide sensitive fields.
   */
  includePurchaseCost: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(
    dto: CreateProductDto,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto> {
    const product = this.productRepository.create({
      name: dto.name,
      category: dto.category,
      stock: dto.stock,
      purchaseCostMinor: dto.purchaseCostMinor,
      sellingPriceMinor: dto.sellingPriceMinor,
      minimumStockThreshold: dto.minimumStockThreshold,
    });

    const saved = await this.productRepository.save(product);
    return this.toResponseDto(saved, options);
  }

  async findAll(options: ProductResponseOptions): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
    return products.map((product) => this.toResponseDto(product, options));
  }

  async findByCategory(
    category: ProductCategory,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: { category },
      order: { name: 'ASC' },
    });
    return products.map((product) => this.toResponseDto(product, options));
  }

  async findById(id: string, options: ProductResponseOptions): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toResponseDto(product, options);
  }

  /**
   * Updates non-stock fields of a product.
   *
   * Stock is intentionally NOT editable through this method. Stock
   * changes must go through InventoryService.applyMovement so that the
   * stock_movements ledger stays consistent.
   */
  async update(
    id: string,
    dto: UpdateProductDto,
    options: ProductResponseOptions,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.category !== undefined) product.category = dto.category;
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
    return this.toResponseDto(saved, options);
  }

  private toResponseDto(product: Product, options: ProductResponseOptions): ProductResponseDto {
    const dto: ProductResponseDto = {
      id: product.id,
      name: product.name,
      category: product.category,
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
