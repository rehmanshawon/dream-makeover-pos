import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountingService } from '../accounting/accounting.service';
import { Product } from '../products/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Purchase } from './purchase.entity';
import { PurchaseLine } from './purchase-line.entity';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';
import { SupplierReturn } from './supplier-return.entity';
import { SupplierReturnLine } from './supplier-return-line.entity';

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

  async findReturnableLines(productId: string): Promise<
    Array<{
      purchaseId: string;
      purchaseDate: string;
      supplierName: string | null;
      paymentMethod: Purchase['paymentMethod'];
      purchaseLineId: string;
      productId: string;
      productName: string;
      productStock: number;
      quantity: number;
      returnedQuantity: number;
      remainingQuantity: number;
      unitCostMinor: number;
    }>
  > {
    const candidateLines = await this.dataSource.getRepository(PurchaseLine).find({
      where: { productId },
      relations: { purchase: true, product: true },
      order: { purchase: { purchaseDate: 'DESC' } },
    });
    if (candidateLines.length === 0) return [];
    const returnedLines = await this.dataSource.getRepository(SupplierReturnLine).find({
      where: candidateLines.map((line) => ({ purchaseLineId: line.id })),
    });
    const returnedByPurchaseLine = new Map<string, number>();
    for (const line of returnedLines) {
      returnedByPurchaseLine.set(
        line.purchaseLineId,
        (returnedByPurchaseLine.get(line.purchaseLineId) ?? 0) + line.quantity,
      );
    }
    return candidateLines.flatMap((line) => {
      const returnedQuantity = returnedByPurchaseLine.get(line.id) ?? 0;
      const remainingQuantity = line.quantity - returnedQuantity;
      if (remainingQuantity <= 0) return [];
      return [
        {
          purchaseId: line.purchase.id,
          purchaseDate: line.purchase.purchaseDate,
          supplierName: line.purchase.supplierName,
          paymentMethod: line.purchase.paymentMethod,
          purchaseLineId: line.id,
          productId: line.productId,
          productName: line.product.name,
          productStock: line.product.stock,
          quantity: line.quantity,
          returnedQuantity,
          remainingQuantity,
          unitCostMinor: line.unitCostMinor,
        },
      ];
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

  async createSupplierReturn(
    dto: CreateSupplierReturnDto,
    createdBy: string,
  ): Promise<SupplierReturn> {
    if (!this.isRealDate(dto.returnDate)) {
      throw new BadRequestException('returnDate must be a valid calendar date.');
    }
    if (new Set(dto.lines.map((line) => line.purchaseLineId)).size !== dto.lines.length) {
      throw new BadRequestException('A purchase line may appear only once per return.');
    }
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.getRepository(Purchase).findOne({
        where: { id: dto.purchaseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!purchase) throw new BadRequestException('Purchase not found.');
      const purchaseLineRepo = manager.getRepository(PurchaseLine);
      const returnRepo = manager.getRepository(SupplierReturn);
      const returnLineRepo = manager.getRepository(SupplierReturnLine);
      const lines = [];
      for (const requested of dto.lines) {
        const purchaseLine = await purchaseLineRepo.findOne({
          where: { id: requested.purchaseLineId, purchaseId: purchase.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!purchaseLine) throw new BadRequestException('Purchase line not found.');
        const priorReturns = await returnLineRepo.find({
          where: { purchaseLineId: purchaseLine.id },
        });
        const previouslyReturned = priorReturns.reduce((sum, line) => sum + line.quantity, 0);
        if (requested.quantity > purchaseLine.quantity - previouslyReturned) {
          throw new BadRequestException('Return quantity exceeds remaining purchased quantity.');
        }
        const supplierCreditMinor = requested.quantity * purchaseLine.unitCostMinor;
        if (!Number.isSafeInteger(supplierCreditMinor)) {
          throw new BadRequestException('Supplier credit exceeds supported accounting limits.');
        }
        lines.push({ purchaseLine, quantity: requested.quantity, supplierCreditMinor });
      }
      const creditMinor = lines.reduce((sum, line) => sum + line.supplierCreditMinor, 0);
      if (!Number.isSafeInteger(creditMinor) || creditMinor < 1) {
        throw new BadRequestException('Supplier return value exceeds supported accounting limits.');
      }
      const supplierReturn = await returnRepo.save(
        returnRepo.create({
          purchaseId: purchase.id,
          returnDate: dto.returnDate,
          supplierName: purchase.supplierName ?? 'Unknown supplier',
          refundMethod: dto.refundMethod,
          creditMinor,
          inventoryValueMinor: 0,
          varianceMinor: 0,
          note: dto.note?.trim() || null,
          createdBy,
        }),
      );
      let inventoryValueMinor = 0;
      const savedLines: SupplierReturnLine[] = [];
      for (const line of lines) {
        const removed = await this.inventoryService.removeSupplierReturn(manager, {
          productId: line.purchaseLine.productId,
          quantity: line.quantity,
          referenceId: supplierReturn.id,
          createdBy,
        });
        inventoryValueMinor += removed.inventoryValueMinor;
        savedLines.push(
          await returnLineRepo.save(
            returnLineRepo.create({
              supplierReturnId: supplierReturn.id,
              purchaseLineId: line.purchaseLine.id,
              productId: line.purchaseLine.productId,
              quantity: line.quantity,
              supplierCreditMinor: line.supplierCreditMinor,
              inventoryValueMinor: removed.inventoryValueMinor,
            }),
          ),
        );
      }
      if (!Number.isSafeInteger(inventoryValueMinor)) {
        throw new BadRequestException('Inventory return value exceeds supported limits.');
      }
      supplierReturn.inventoryValueMinor = inventoryValueMinor;
      supplierReturn.varianceMinor = Math.abs(creditMinor - inventoryValueMinor);
      await returnRepo.save(supplierReturn);
      await this.accountingService.createSupplierReturnEntry(manager, {
        sourceSupplierReturnId: supplierReturn.id,
        returnDate: supplierReturn.returnDate,
        refundMethod: supplierReturn.refundMethod,
        creditMinor,
        inventoryValueMinor,
        createdBy,
      });
      supplierReturn.lines = savedLines;
      return supplierReturn;
    });
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
