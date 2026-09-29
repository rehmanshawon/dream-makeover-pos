import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountingService } from '../accounting/accounting.service';
import { Product } from '../products/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Purchase } from './purchase.entity';
import { PurchaseLine } from './purchase-line.entity';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
  ) {}

  async create(dto: CreatePurchaseDto, createdBy: string): Promise<Purchase> {
    if (!this.isRealDate(dto.purchaseDate)) {
      throw new BadRequestException('purchaseDate must be a valid calendar date.');
    }
    const totalMinor = dto.lines.reduce((sum, line) => sum + line.quantity * line.unitCostMinor, 0);
    if (!Number.isSafeInteger(totalMinor) || totalMinor < 1) {
      throw new BadRequestException('Purchase total exceeds supported accounting limits.');
    }

    return this.dataSource.transaction(async (manager) => {
      const purchaseRepo = manager.getRepository(Purchase);
      const lineRepo = manager.getRepository(PurchaseLine);
      const productRepo = manager.getRepository(Product);
      for (const line of dto.lines) {
        const product = await productRepo.findOne({ where: { id: line.productId } });
        if (!product) throw new BadRequestException(`Product not found: ${line.productId}`);
        if (!Number.isSafeInteger(line.quantity * line.unitCostMinor)) {
          throw new BadRequestException('Purchase line total exceeds supported limits.');
        }
      }

      const purchase = await purchaseRepo.save(
        purchaseRepo.create({
          purchaseDate: dto.purchaseDate,
          supplierName: dto.supplierName?.trim() || null,
          supplierReference: dto.supplierReference?.trim() || null,
          paymentMethod: dto.paymentMethod,
          totalMinor,
          createdBy,
        }),
      );

      const lines: PurchaseLine[] = [];
      for (const line of dto.lines) {
        const totalCostMinor = line.quantity * line.unitCostMinor;
        const savedLine = await lineRepo.save(
          lineRepo.create({
            purchaseId: purchase.id,
            productId: line.productId,
            quantity: line.quantity,
            unitCostMinor: line.unitCostMinor,
            totalCostMinor,
          }),
        );
        lines.push(savedLine);
        await this.inventoryService.receivePurchaseLine(manager, {
          productId: line.productId,
          quantity: line.quantity,
          unitCostMinor: line.unitCostMinor,
          referenceId: purchase.id,
          createdBy,
        });
      }

      await this.accountingService.createPurchaseEntry(manager, {
        sourcePurchaseId: purchase.id,
        purchaseDate: purchase.purchaseDate,
        supplierName: purchase.supplierName,
        supplierReference: purchase.supplierReference,
        paymentMethod: purchase.paymentMethod,
        totalMinor,
        createdBy,
      });
      purchase.lines = lines;
      return purchase;
    });
  }

  async findAll(): Promise<Purchase[]> {
    return this.dataSource.getRepository(Purchase).find({
      relations: { lines: { product: true } },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
      take: 200,
    });
  }

  async recordSupplierPayment(
    dto: CreateSupplierPaymentDto,
    createdBy: string,
  ): Promise<{ recorded: true }> {
    if (!this.isRealDate(dto.paymentDate)) {
      throw new BadRequestException('paymentDate must be a valid calendar date.');
    }
    await this.dataSource.transaction(async (manager) => {
      await this.accountingService.createSupplierPaymentEntry(manager, {
        paymentDate: dto.paymentDate,
        amountMinor: dto.amountMinor,
        supplierName: dto.supplierName.trim(),
        paymentAccountCode:
          dto.paymentAccountCode === 'MOBILE' ? 'MOBILE_WALLET' : dto.paymentAccountCode,
        reference: dto.reference?.trim() || null,
        createdBy,
      });
    });
    return { recorded: true };
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
