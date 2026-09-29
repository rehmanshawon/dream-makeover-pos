import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Account } from '../src/accounting/account.entity';
import { AccountingService } from '../src/accounting/accounting.service';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { InventoryService } from '../src/inventory/inventory.service';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem, TransactionItemType } from '../src/transactions/transaction-item.entity';
import { SalesReturn } from '../src/returns/sales-return.entity';
import { SalesReturnLine } from '../src/returns/sales-return-line.entity';
import { SalesReturnsService } from '../src/returns/sales-returns.service';
import {
  createTestDataSource,
  TEST_PRODUCT_CATEGORY_ID,
  truncateAllTables,
} from './helpers/test-data-source';

describe('Sales returns (integration)', () => {
  let dataSource: DataSource;
  let service: SalesReturnsService;
  let transactionId: string;
  let itemId: string;
  let productId: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    const accounting = new AccountingService(
      dataSource,
      dataSource.getRepository(Account),
      dataSource.getRepository(JournalEntry),
    );
    const inventory = new InventoryService(dataSource, accounting);
    service = new SalesReturnsService(dataSource, inventory, accounting);
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    const product = await dataSource.getRepository(Product).save(
      dataSource.getRepository(Product).create({
        name: 'Returned lipstick',
        categoryId: TEST_PRODUCT_CATEGORY_ID,
        stock: 0,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 10001,
      }),
    );
    productId = product.id;

    const transaction = await dataSource.getRepository(Transaction).save(
      dataSource.getRepository(Transaction).create({
        invoiceId: 'DM-RETURN-0001',
        customerId: null,
        subtotalMinor: 20002,
        discountMinor: 1,
        vatRatePercent: 0,
        vatMinor: 0,
        totalMinor: 20001,
        cashReceivedMinor: 20001,
        changeMinor: 0,
        costOfGoodsSoldMinor: 20000,
        cashier: 'admin',
      }),
    );
    transactionId = transaction.id;

    const item = await dataSource.getRepository(TransactionItem).save(
      dataSource.getRepository(TransactionItem).create({
        transactionId,
        productId,
        serviceId: null,
        packageId: null,
        itemType: TransactionItemType.PRODUCT,
        itemName: 'Returned lipstick',
        quantity: 2,
        unitPriceMinor: 10001,
        totalPriceMinor: 20002,
        costOfGoodsSoldMinor: 20000,
      }),
    );
    itemId = item.id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('restores stock and posts exact cumulative refund and COGS reversals for partial returns', async () => {
    const first = await service.create(
      {
        transactionId,
        returnDate: '2026-09-29',
        refundMethod: PaymentMethod.CASH,
        lines: [{ transactionItemId: itemId, quantity: 1 }],
      },
      'admin',
    );
    const second = await service.create(
      {
        transactionId,
        returnDate: '2026-09-29',
        refundMethod: PaymentMethod.CASH,
        lines: [{ transactionItemId: itemId, quantity: 1 }],
      },
      'admin',
    );

    expect(first.refundMinor).toBe(10000);
    expect(second.refundMinor).toBe(10001);
    expect(first.cogsReversalMinor + second.cogsReversalMinor).toBe(20000);
    expect(
      await dataSource.getRepository(Product).findOne({ where: { id: productId } }),
    ).toMatchObject({
      stock: 2,
      purchaseCostMinor: 10000,
    });
    expect(await dataSource.getRepository(SalesReturn).count({ where: { transactionId } })).toBe(2);
    expect(await dataSource.getRepository(SalesReturnLine).count()).toBe(2);

    const entries = await dataSource.getRepository(JournalEntry).find({
      where: { entryType: JournalEntryType.SALES_RETURN },
      relations: { lines: { account: true } },
    });
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      const debits = entry.lines.reduce((sum, line) => sum + line.debitMinor, 0);
      const credits = entry.lines.reduce((sum, line) => sum + line.creditMinor, 0);
      expect(debits).toBe(credits);
    }
  });

  it('rejects returning more than the sold quantity without changing stock', async () => {
    await expect(
      service.create(
        {
          transactionId,
          returnDate: '2026-09-29',
          lines: [{ transactionItemId: itemId, quantity: 3 }],
        },
        'admin',
      ),
    ).rejects.toThrow('Return quantity exceeds remaining sold quantity');

    expect(
      await dataSource.getRepository(Product).findOne({ where: { id: productId } }),
    ).toMatchObject({
      stock: 0,
    });
    expect(await dataSource.getRepository(SalesReturn).count()).toBe(0);
  });
});
