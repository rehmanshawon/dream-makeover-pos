import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Account } from '../src/accounting/account.entity';
import { AccountingService } from '../src/accounting/accounting.service';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { InventoryService } from '../src/inventory/inventory.service';
import { CostRevaluation } from '../src/inventory/cost-revaluation.entity';
import { Product } from '../src/products/product.entity';
import { PurchasePaymentMethod } from '../src/purchases/purchase-payment-method.enum';
import { PurchasesService } from '../src/purchases/purchases.service';
import { SupplierReturn } from '../src/purchases/supplier-return.entity';
import {
  createTestDataSource,
  TEST_PRODUCT_CATEGORY_ID,
  truncateAllTables,
} from './helpers/test-data-source';
import { FinancialSummaryService } from '../src/reports/financial-summary.service';

describe('Supplier returns and cost revaluation (integration)', () => {
  let dataSource: DataSource;
  let inventory: InventoryService;
  let purchases: PurchasesService;
  let productId: string;
  let purchaseId: string;
  let purchaseLineId: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    const accounting = new AccountingService(
      dataSource,
      dataSource.getRepository(Account),
      dataSource.getRepository(JournalEntry),
    );
    inventory = new InventoryService(dataSource, accounting);
    purchases = new PurchasesService(dataSource, inventory, accounting);
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Supplier return lipstick',
        categoryId: TEST_PRODUCT_CATEGORY_ID,
        stock: 0,
        purchaseCostMinor: 0,
        sellingPriceMinor: 18000,
      }),
    );
    productId = product.id;
    const purchase = await purchases.create(
      {
        purchaseDate: '2026-09-30',
        supplierName: 'Beauty Supply Co',
        supplierReference: 'INV-400',
        paymentMethod: PurchasePaymentMethod.CREDIT,
        lines: [{ productId, quantity: 3, unitCostMinor: 10000 }],
      },
      'admin',
    );
    purchaseId = purchase.id;
    purchaseLineId = purchase.lines[0].id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('revalues cost up and down, then returns supplier stock at carrying value', async () => {
    const increase = await inventory.revalueCost(
      {
        productId,
        effectiveDate: '2026-09-30',
        newUnitCostMinor: 12500,
        note: 'Corrected invoice cost',
      },
      'admin',
    );
    const decrease = await inventory.revalueCost(
      {
        productId,
        effectiveDate: '2026-09-30',
        newUnitCostMinor: 9000,
      },
      'admin',
    );

    expect(increase.inventoryValueDeltaMinor).toBe(7500);
    expect(decrease.inventoryValueDeltaMinor).toBe(-10500);

    const supplierReturn = await purchases.createSupplierReturn(
      {
        purchaseId,
        returnDate: '2026-09-30',
        refundMethod: PurchasePaymentMethod.CREDIT,
        lines: [{ purchaseLineId, quantity: 1 }],
      },
      'admin',
    );

    expect(supplierReturn.creditMinor).toBe(10000);
    expect(supplierReturn.inventoryValueMinor).toBe(9000);
    expect(supplierReturn.varianceMinor).toBe(1000);
    expect(await dataSource.getRepository(CostRevaluation).count()).toBe(2);
    expect(await dataSource.getRepository(SupplierReturn).count()).toBe(1);
    await expect(purchases.findReturnableLines(productId)).resolves.toMatchObject([
      { purchaseLineId, returnedQuantity: 1, remainingQuantity: 2, productStock: 2 },
    ]);
    expect(
      await dataSource.getRepository(Product).findOne({ where: { id: productId } }),
    ).toMatchObject({
      stock: 2,
      purchaseCostMinor: 9000,
    });

    const entries = await dataSource.getRepository(JournalEntry).find({
      where: [
        { entryType: JournalEntryType.INVENTORY_REVALUATION },
        { entryType: JournalEntryType.SUPPLIER_RETURN },
      ],
      relations: { lines: { account: true } },
    });
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      const debits = entry.lines.reduce((sum, line) => sum + line.debitMinor, 0);
      const credits = entry.lines.reduce((sum, line) => sum + line.creditMinor, 0);
      expect(debits).toBe(credits);
    }
    const supplierEntry = entries.find(
      (entry) => entry.entryType === JournalEntryType.SUPPLIER_RETURN,
    );
    expect(
      supplierEntry?.lines.find((line) => line.account.code === 'SUPPLIER_RETURN_GAIN')
        ?.creditMinor,
    ).toBe(1000);

    const summary = await new FinancialSummaryService(dataSource).summarize({
      range: 'custom',
      from: '2026-09-30',
      to: '2026-09-30',
    });
    expect(summary.revenue.otherIncomeMinor).toBe(8500);
    expect(summary.expenses.inventoryAdjustmentLossesMinor).toBe(10500);
    expect(summary.netOperatingResultMinor).toBe(-2000);
  });

  it('rejects supplier return quantities beyond the original purchase and available stock', async () => {
    await expect(
      purchases.createSupplierReturn(
        {
          purchaseId,
          returnDate: '2026-09-30',
          refundMethod: PurchasePaymentMethod.CREDIT,
          lines: [{ purchaseLineId, quantity: 4 }],
        },
        'admin',
      ),
    ).rejects.toThrow('Return quantity exceeds remaining purchased quantity');

    await purchases.createSupplierReturn(
      {
        purchaseId,
        returnDate: '2026-09-30',
        refundMethod: PurchasePaymentMethod.CREDIT,
        lines: [{ purchaseLineId, quantity: 1 }],
      },
      'admin',
    );
    await dataSource.transaction((manager) =>
      inventory.applySaleMovement(manager, {
        productId,
        quantity: 2,
        referenceId: 'test-sale',
        createdBy: 'admin',
      }),
    );
    await expect(
      purchases.createSupplierReturn(
        {
          purchaseId,
          returnDate: '2026-09-30',
          refundMethod: PurchasePaymentMethod.CREDIT,
          lines: [{ purchaseLineId, quantity: 1 }],
        },
        'admin',
      ),
    ).rejects.toThrow('Insufficient stock to return');

    expect(
      await dataSource.getRepository(Product).findOne({ where: { id: productId } }),
    ).toMatchObject({
      stock: 0,
    });
    expect(await dataSource.getRepository(SupplierReturn).count()).toBe(1);
  });

  it('posts a balanced return when inventory carrying value is zero', async () => {
    await inventory.revalueCost(
      { productId, effectiveDate: '2026-09-30', newUnitCostMinor: 0 },
      'admin',
    );
    const supplierReturn = await purchases.createSupplierReturn(
      {
        purchaseId,
        returnDate: '2026-09-30',
        refundMethod: PurchasePaymentMethod.CREDIT,
        lines: [{ purchaseLineId, quantity: 1 }],
      },
      'admin',
    );
    expect(supplierReturn.inventoryValueMinor).toBe(0);
    const entry = await dataSource.getRepository(JournalEntry).findOneOrFail({
      where: { entryType: JournalEntryType.SUPPLIER_RETURN },
      relations: { lines: true },
    });
    expect(entry.lines).toHaveLength(2);
    expect(entry.lines.every((line) => line.debitMinor > 0 || line.creditMinor > 0)).toBe(true);
  });
});
