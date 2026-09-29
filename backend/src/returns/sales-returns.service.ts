import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountingService } from '../accounting/accounting.service';
import { Customer } from '../customers/customer.entity';
import { InventoryService } from '../inventory/inventory.service';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem, TransactionItemType } from '../transactions/transaction-item.entity';
import { PaymentMethod } from '../salary-payments/payment-method.enum';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturn } from './sales-return.entity';
import { SalesReturnLine } from './sales-return-line.entity';

@Injectable()
export class SalesReturnsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
  ) {}

  async create(dto: CreateSalesReturnDto, createdBy: string): Promise<SalesReturn> {
    if (!this.isRealDate(dto.returnDate)) {
      throw new BadRequestException('returnDate must be a valid calendar date.');
    }
    if (new Set(dto.lines.map((line) => line.transactionItemId)).size !== dto.lines.length) {
      throw new BadRequestException('A sale line may appear only once per return.');
    }

    return this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(Transaction);
      const itemRepo = manager.getRepository(TransactionItem);
      const returnRepo = manager.getRepository(SalesReturn);
      const returnLineRepo = manager.getRepository(SalesReturnLine);
      const transaction = await transactionRepo.findOne({
        where: { id: dto.transactionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) throw new NotFoundException('Sale not found.');

      const items = await itemRepo.find({ where: { transactionId: transaction.id } });
      const returns = await returnRepo.find({ where: { transactionId: transaction.id } });
      const returnedByItem = new Map<
        string,
        {
          quantity: number;
          grossMinor: number;
          revenueMinor: number;
          vatMinor: number;
          cogsMinor: number;
        }
      >();
      for (const priorReturn of returns) {
        const priorLines = await returnLineRepo.find({ where: { salesReturnId: priorReturn.id } });
        for (const line of priorLines) {
          const totals = returnedByItem.get(line.transactionItemId) ?? {
            quantity: 0,
            grossMinor: 0,
            revenueMinor: 0,
            vatMinor: 0,
            cogsMinor: 0,
          };
          totals.quantity += line.quantity;
          totals.grossMinor += line.grossMinor;
          totals.revenueMinor += line.revenueReversalMinor;
          totals.vatMinor += line.vatReversalMinor;
          totals.cogsMinor += line.cogsReversalMinor;
          returnedByItem.set(line.transactionItemId, totals);
        }
      }

      const selected = dto.lines.map((requested) => {
        const item = items.find((candidate) => candidate.id === requested.transactionItemId);
        if (!item || item.itemType !== TransactionItemType.PRODUCT || !item.productId) {
          throw new BadRequestException('Only directly sold product lines can be returned.');
        }
        const prior = returnedByItem.get(item.id) ?? {
          quantity: 0,
          grossMinor: 0,
          revenueMinor: 0,
          vatMinor: 0,
          cogsMinor: 0,
        };
        const remaining = item.quantity - prior.quantity;
        if (requested.quantity > remaining) {
          throw new BadRequestException(
            `Return quantity exceeds remaining sold quantity for ${item.itemName}.`,
          );
        }
        const cumulativeQuantity = prior.quantity + requested.quantity;
        const cumulativeGross = Math.floor(
          (item.totalPriceMinor * cumulativeQuantity) / item.quantity,
        );
        const returnedGross = cumulativeGross - prior.grossMinor;
        const netTransactionSales = transaction.subtotalMinor - transaction.discountMinor;
        const cumulativeRevenue = Math.floor(
          (cumulativeGross * netTransactionSales) / transaction.subtotalMinor,
        );
        const cumulativeVat =
          transaction.subtotalMinor > 0
            ? Math.floor((cumulativeGross * transaction.vatMinor) / transaction.subtotalMinor)
            : 0;
        const cumulativeCogs = Math.round(
          (item.costOfGoodsSoldMinor * cumulativeQuantity) / item.quantity,
        );
        return {
          item,
          quantity: requested.quantity,
          grossMinor: returnedGross,
          revenueMinor: cumulativeRevenue - prior.revenueMinor,
          vatMinor: cumulativeVat - prior.vatMinor,
          cogsMinor: cumulativeCogs - prior.cogsMinor,
        };
      });

      const totals = selected.reduce(
        (sum, line) => ({
          grossMinor: sum.grossMinor + line.grossMinor,
          revenueMinor: sum.revenueMinor + line.revenueMinor,
          vatMinor: sum.vatMinor + line.vatMinor,
          cogsMinor: sum.cogsMinor + line.cogsMinor,
        }),
        { grossMinor: 0, revenueMinor: 0, vatMinor: 0, cogsMinor: 0 },
      );
      const refundMinor = totals.revenueMinor + totals.vatMinor;
      if (!Number.isSafeInteger(refundMinor) || !Number.isSafeInteger(totals.cogsMinor)) {
        throw new BadRequestException('Return value exceeds supported accounting limits.');
      }

      const salesReturn = await returnRepo.save(
        returnRepo.create({
          transactionId: transaction.id,
          returnDate: dto.returnDate,
          refundMethod: dto.refundMethod ?? PaymentMethod.CASH,
          refundMinor,
          revenueReversalMinor: totals.revenueMinor,
          vatReversalMinor: totals.vatMinor,
          cogsReversalMinor: totals.cogsMinor,
          note: dto.note?.trim() || null,
          createdBy,
        }),
      );

      const savedLines: SalesReturnLine[] = [];
      for (const line of selected) {
        const savedLine = await returnLineRepo.save(
          returnLineRepo.create({
            salesReturnId: salesReturn.id,
            transactionItemId: line.item.id,
            productId: line.item.productId!,
            quantity: line.quantity,
            grossMinor: line.grossMinor,
            revenueReversalMinor: line.revenueMinor,
            vatReversalMinor: line.vatMinor,
            refundMinor: line.revenueMinor + line.vatMinor,
            cogsReversalMinor: line.cogsMinor,
          }),
        );
        savedLines.push(savedLine);
        await this.inventoryService.receiveCustomerReturn(manager, {
          productId: line.item.productId!,
          quantity: line.quantity,
          returnedCostMinor: line.cogsMinor,
          referenceId: salesReturn.id,
          createdBy,
        });
      }

      await this.accountingService.createSalesReturnEntry(manager, {
        sourceSalesReturnId: salesReturn.id,
        returnDate: salesReturn.returnDate,
        refundMethod: salesReturn.refundMethod,
        refundMinor,
        revenueReversalMinor: totals.revenueMinor,
        vatReversalMinor: totals.vatMinor,
        cogsReversalMinor: totals.cogsMinor,
        createdBy,
      });

      if (transaction.customerId) {
        const customerRepo = manager.getRepository(Customer);
        const customer = await customerRepo.findOne({ where: { id: transaction.customerId } });
        if (customer) {
          customer.lifetimeSpendMinor = Math.max(0, customer.lifetimeSpendMinor - refundMinor);
          customer.rewardPoints = Math.max(
            0,
            customer.rewardPoints - Math.floor(refundMinor / 10000),
          );
          await customerRepo.save(customer);
        }
      }

      salesReturn.lines = savedLines;
      return salesReturn;
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
