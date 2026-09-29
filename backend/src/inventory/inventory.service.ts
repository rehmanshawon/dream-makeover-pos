import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from './stock-movement.entity';
import { StockMovementReason } from './stock-movement-reason.enum';
import { StockInDto } from './dto/stock-in.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { LowStockProductDto } from './dto/low-stock-product.dto';
import { InventoryStatsDto } from './dto/inventory-stats.dto';
import { CategoriesService } from '../categories/categories.service';
import { AccountingService } from '../accounting/accounting.service';
import { CostRevaluation } from './cost-revaluation.entity';
import { CreateCostRevaluationDto } from './dto/create-cost-revaluation.dto';

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
  constructor(
    private readonly dataSource: DataSource,
    private readonly accountingService: AccountingService,
    @Optional() private readonly categoriesService?: CategoriesService,
  ) {}

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
      const product = await manager.getRepository(Product).findOne({
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Product not found');
      const inventoryValueMinor = Math.abs(dto.delta) * product.purchaseCostMinor;
      if (!Number.isSafeInteger(inventoryValueMinor)) {
        throw new BadRequestException('Adjustment value exceeds supported accounting limits.');
      }

      const movement = await this.applyMovement(manager, {
        productId: dto.productId,
        delta: dto.delta,
        reason: StockMovementReason.ADJUSTMENT,
        referenceId: null,
        note: dto.note,
        createdBy,
      });
      await this.accountingService.createInventoryAdjustmentEntry(manager, {
        sourceStockMovementId: movement.id,
        entryDate: new Date().toISOString().slice(0, 10),
        delta: dto.delta,
        inventoryValueMinor,
        note: dto.note,
        createdBy,
      });
      return movement;
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

    const categoryNames = await this.loadCategoryNames(products);
    return products.map((p) => this.toLowStockDto(p, categoryNames.get(p.categoryId)));
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

    const categoryNames = await this.loadCategoryNames(products);
    return products.map((p) => this.toLowStockDto(p, categoryNames.get(p.categoryId)));
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

  private async loadCategoryNames(products: Product[]): Promise<Map<string, string>> {
    if (!this.categoriesService || products.length === 0) return new Map();
    const categories = await this.categoriesService.loadByIds(products.map((p) => p.categoryId));
    return new Map(Array.from(categories.entries()).map(([id, category]) => [id, category.name]));
  }

  private toLowStockDto(product: Product, categoryName?: string): LowStockProductDto {
    return {
      id: product.id,
      name: product.name,
      category: categoryName ?? product.categoryId,
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

  async applySaleMovement(
    manager: EntityManager,
    input: { productId: string; quantity: number; referenceId: string; createdBy: string },
  ): Promise<{ movement: StockMovementResponseDto; costMinor: number }> {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: input.productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stock < input.quantity) {
      throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
    }
    const costMinor = product.purchaseCostMinor * input.quantity;
    if (!Number.isSafeInteger(costMinor)) {
      throw new BadRequestException('Sale cost exceeds supported accounting limits.');
    }
    product.stock -= input.quantity;
    await productRepo.save(product);
    const movementRepo = manager.getRepository(StockMovement);
    const movement = movementRepo.create({
      productId: product.id,
      delta: -input.quantity,
      reason: StockMovementReason.SALE,
      referenceId: input.referenceId,
      note: null,
      createdBy: input.createdBy,
    });
    await movementRepo.save(movement);
    return { movement: this.toResponse(movement), costMinor };
  }

  async receivePurchaseLine(
    manager: EntityManager,
    input: {
      productId: string;
      quantity: number;
      unitCostMinor: number;
      referenceId: string;
      createdBy: string;
    },
  ): Promise<StockMovementResponseDto> {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: input.productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('Product not found');
    const nextStock = product.stock + input.quantity;
    if (!Number.isSafeInteger(nextStock) || nextStock > 2_147_483_647) {
      throw new BadRequestException('Received quantity exceeds supported stock limits.');
    }
    const oldValue = product.stock * product.purchaseCostMinor;
    const receivedValue = input.quantity * input.unitCostMinor;
    const newAverageCost = Math.round((oldValue + receivedValue) / nextStock);
    if (!Number.isSafeInteger(newAverageCost)) {
      throw new BadRequestException('Purchase value exceeds supported accounting limits.');
    }
    product.stock = nextStock;
    product.purchaseCostMinor = newAverageCost;
    await productRepo.save(product);
    const movementRepo = manager.getRepository(StockMovement);
    const movement = movementRepo.create({
      productId: product.id,
      delta: input.quantity,
      reason: StockMovementReason.PURCHASE,
      referenceId: input.referenceId,
      note: `Purchase unit cost ${input.unitCostMinor}`,
      createdBy: input.createdBy,
    });
    return this.toResponse(await movementRepo.save(movement));
  }

  async receiveCustomerReturn(
    manager: EntityManager,
    input: {
      productId: string;
      quantity: number;
      returnedCostMinor: number;
      referenceId: string;
      createdBy: string;
    },
  ): Promise<StockMovementResponseDto> {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: input.productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('Product not found');
    const nextStock = product.stock + input.quantity;
    const currentValue = product.stock * product.purchaseCostMinor;
    if (!Number.isSafeInteger(nextStock) || nextStock > 2_147_483_647) {
      throw new BadRequestException('Returned quantity exceeds supported stock limits.');
    }
    if (!Number.isSafeInteger(input.returnedCostMinor) || input.returnedCostMinor < 0) {
      throw new BadRequestException('Returned cost exceeds supported accounting limits.');
    }
    const nextValue = currentValue + input.returnedCostMinor;
    product.stock = nextStock;
    if (nextStock > 0) product.purchaseCostMinor = Math.round(nextValue / nextStock);
    await productRepo.save(product);

    const movementRepo = manager.getRepository(StockMovement);
    const movement = movementRepo.create({
      productId: product.id,
      delta: input.quantity,
      reason: StockMovementReason.RETURN,
      referenceId: input.referenceId,
      note: 'Customer return',
      createdBy: input.createdBy,
    });
    const saved = await movementRepo.save(movement);
    return this.toResponse(saved);
  }

  async removeSupplierReturn(
    manager: EntityManager,
    input: {
      productId: string;
      quantity: number;
      referenceId: string;
      createdBy: string;
    },
  ): Promise<{ movement: StockMovementResponseDto; inventoryValueMinor: number }> {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: input.productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stock < input.quantity) {
      throw new BadRequestException(`Insufficient stock to return ${product.name} to supplier.`);
    }
    const inventoryValueMinor = product.purchaseCostMinor * input.quantity;
    if (!Number.isSafeInteger(inventoryValueMinor)) {
      throw new BadRequestException('Supplier return value exceeds supported accounting limits.');
    }
    product.stock -= input.quantity;
    await productRepo.save(product);
    const movementRepo = manager.getRepository(StockMovement);
    const movement = await movementRepo.save(
      movementRepo.create({
        productId: product.id,
        delta: -input.quantity,
        reason: StockMovementReason.SUPPLIER_RETURN,
        referenceId: input.referenceId,
        note: 'Supplier return',
        createdBy: input.createdBy,
      }),
    );
    return { movement: this.toResponse(movement), inventoryValueMinor };
  }

  async revalueCost(dto: CreateCostRevaluationDto, createdBy: string): Promise<CostRevaluation> {
    if (!this.isRealDate(dto.effectiveDate)) {
      throw new BadRequestException('effectiveDate must be a valid calendar date.');
    }
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const product = await productRepo.findOne({
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (product.purchaseCostMinor === dto.newUnitCostMinor) {
        throw new BadRequestException('New unit cost must differ from the current cost.');
      }
      const inventoryValueDeltaMinor =
        product.stock * (dto.newUnitCostMinor - product.purchaseCostMinor);
      if (!Number.isSafeInteger(inventoryValueDeltaMinor)) {
        throw new BadRequestException('Revaluation exceeds supported accounting limits.');
      }
      const revaluationRepo = manager.getRepository(CostRevaluation);
      const revaluation = await revaluationRepo.save(
        revaluationRepo.create({
          productId: product.id,
          effectiveDate: dto.effectiveDate,
          stockSnapshot: product.stock,
          previousUnitCostMinor: product.purchaseCostMinor,
          newUnitCostMinor: dto.newUnitCostMinor,
          inventoryValueDeltaMinor,
          note: dto.note?.trim() || null,
          createdBy,
        }),
      );
      product.purchaseCostMinor = dto.newUnitCostMinor;
      await productRepo.save(product);
      await this.accountingService.createInventoryRevaluationEntry(manager, {
        sourceCostRevaluationId: revaluation.id,
        effectiveDate: revaluation.effectiveDate,
        inventoryValueDeltaMinor,
        createdBy,
      });
      return revaluation;
    });
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

  private isRealDate(value: string): boolean {
    const [yearText, monthText, dayText] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }
}
