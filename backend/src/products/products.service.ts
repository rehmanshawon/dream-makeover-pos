import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = this.productRepository.create({
      name: dto.name,
      category: dto.category,
      stock: dto.stock,
      purchaseCostMinor: dto.purchaseCostMinor,
      sellingPriceMinor: dto.sellingPriceMinor,
      minimumStockThreshold: dto.minimumStockThreshold,
    });

    const saved = await this.productRepository.save(product);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
    return products.map((product) => this.toResponseDto(product));
  }

  async findByCategory(category: Product['category']): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: { category },
      order: { name: 'ASC' },
    });
    return products.map((product) => this.toResponseDto(product));
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toResponseDto(product);
  }

  private toResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      stock: product.stock,
      purchaseCostMinor: Number(product.purchaseCostMinor),
      sellingPriceMinor: Number(product.sellingPriceMinor),
      minimumStockThreshold: product.minimumStockThreshold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
