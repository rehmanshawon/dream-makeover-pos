import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from './stock-movement.entity';
import { StockMovementReason } from './stock-movement-reason.enum';
import { StockInDto } from './dto/stock-in.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { LowStockProductDto } from './dto/low-stock-product.dto';
import { InventoryStatsDto } from './dto/inventory-stats.dto';

/**
 * InventoryService — the single writer for product stock.
 *
 * Concurrency strategy:
 * - Every stock change goes through applyMovement.
 * - applyMovement acquires a pessimistic write lock on the target product
 *   row via SELECT ... FOR UPDATE.
 * - The lock is held until the surrounding database transaction commits.
 *
 * This guarantees that two concurrent stock changes on the same product
 * are serialized. The second transaction sees the post-update value and
 * computes the correct next value.
 *
 * Do not bypass applyMovement. Any direct mutation of Product.stock
 * outside this service risks introducing lost updates and desynchronizing
 * the stock_movements ledger.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Adds stock to a product and records a STOCK_IN movement.
   */
  async stockIn(dto: StockInDto, createdBy: string): Promise<StockMovementResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      return this.applyMovement(manager, {
        productId: dto.productId,
        delta: dto.quantity,
        reason: StockMovementReason.STOCK_IN,
        referenceId: null,
        note: dto.note ?? null,
        createdBy,
      });
    });
  }

  /**
   * Applies a manual adjustment to a product's stock.
   * The delta may be positive or negative and must not result in negative stock.
   */
  async adjust(dto: AdjustmentDto, createdBy: string): Promise<StockMovementResponseDto> {
    if (dto.delta === 0) {
      throw new BadRequestException('Adjustment delta must not be zero');
    }

    return this.dataSource.transaction(async (manager) => {
      return this.applyMovement(manager, {
        productId: dto.productId,
        delta: dto.delta,
        reason: StockMovementReason.ADJUSTMENT,
        referenceId: null,
        note: dto.note,
        createdBy,
      });
    });
  }

  /**
   * Returns the stock movement history of a product, newest first.
   */
  async historyForProduct(productId: string): Promise<StockMovementResponseDto[]> {
    const productRepo = this.dataSource.getRepository(Product);
    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const movementRepo = this.dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });

    return movements.map((m) => this.toResponse(m));
  }

  /**
   * Returns products whose current stock is at or below their minimum
   * threshold, ordered by severity (lowest stock first).
   *
   * Out-of-stock products are included.
   */
  async findLowStock(): Promise<LowStockProductDto[]> {
    const productRepo = this.dataSource.getRepository(Product);
    const products = await productRepo
      .createQueryBuilder('p')
      .where('p.stock <= p.minimum_stock_threshold')
      .orderBy('p.stock', 'ASC')
      .addOrderBy('p.name', 'ASC')
      .getMany();

    return products.map((p) => this.toLowStockDto(p));
  }

  /**
   * Returns products whose current stock is exactly zero.
   */
  async findOutOfStock(): Promise<LowStockProductDto[]> {
    const productRepo = this.dataSource.getRepository(Product);
    const products = await productRepo.find({
      where: { stock: 0 },
      order: { name: 'ASC' },
    });

    return products.map((p) => this.toLowStockDto(p));
  }

  /**
   * Returns aggregate inventory statistics for dashboard display.
   */
  async getStats(): Promise<InventoryStatsDto> {
    const productRepo = this.dataSource.getRepository(Product);

    const totalProducts = await productRepo.count();

    const lowStockCount = await productRepo
      .createQueryBuilder('p')
      .where('p.stock <= p.minimum_stock_threshold')
      .getCount();

    const outOfStockCount = await productRepo.count({
      where: { stock: 0 },
    });

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
    };
  }

  private toLowStockDto(product: Product): LowStockProductDto {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      stock: product.stock,
      minimumStockThreshold: product.minimumStockThreshold,
      sellingPriceMinor: product.sellingPriceMinor,
      outOfStock: product.stock === 0,
    };
  }

  /**
   * Applies a stock movement inside an existing transaction manager.
   *
   * This is the single point where product stock and stock movement rows
   * are written together. It is used by stockIn, adjust, and by the
   * checkout service (with reason SALE).
   *
   * Callers are responsible for wrapping this call in a transaction.
   */
  /**
   * Applies a stock movement inside an existing transaction manager.
   *
   * This is the single point where product stock and stock movement rows
   * are written together. It is used by stockIn, adjust, and by the
   * checkout service (with reason SALE).
   *
   * The product row is locked with SELECT ... FOR UPDATE before being
   * read. This prevents lost updates when two concurrent transactions
   * attempt to modify the same product.
   *
   * Callers are responsible for wrapping this call in a transaction.
   */
  async applyMovement(
    manager: EntityManager,
    input: {
      productId: string;
      delta: number;
      reason: StockMovementReason;
      referenceId: string | null;
      note: string | null;
      createdBy: string;
    },
  ): Promise<StockMovementResponseDto> {
    const productRepo = manager.getRepository(Product);
    const movementRepo = manager.getRepository(StockMovement);

    const product = await productRepo.findOne({
      where: { id: input.productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + input.delta;
    if (newStock < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative stock for ${product.name}`,
      );
    }

    product.stock = newStock;
    await productRepo.save(product);

    const movement = movementRepo.create({
      productId: product.id,
      delta: input.delta,
      reason: input.reason,
      referenceId: input.referenceId,
      note: input.note,
      createdBy: input.createdBy,
    });
    const saved = await movementRepo.save(movement);

    return this.toResponse(saved);
  }

  private toResponse(movement: StockMovement): StockMovementResponseDto {
    return {
      id: movement.id,
      productId: movement.productId,
      delta: movement.delta,
      reason: movement.reason,
      referenceId: movement.referenceId,
      note: movement.note,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
    };
  }
}
