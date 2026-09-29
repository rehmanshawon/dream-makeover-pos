import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteInventoryCostAccounting1700000000030 implements MigrationInterface {
  name = 'CompleteInventoryCostAccounting1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT', 'OPENING_BALANCE'
      ) NOT NULL
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO accounting_accounts (id, code, name, type, is_system)
      VALUES ('00000000-0000-4000-8000-000000000024', 'OPENING_BALANCE_EQUITY',
              'Opening balance equity', 'EQUITY', 1)
    `);
    await queryRunner.query(`
      UPDATE transaction_items item
      INNER JOIN transactions tx ON tx.id = item.transaction_id
      INNER JOIN products product ON product.id = item.product_id
      SET item.cost_of_goods_sold_minor = item.quantity * product.purchase_cost_minor
      WHERE item.item_type = 'PRODUCT'
        AND tx.cost_of_goods_sold_minor = 0
        AND EXISTS (
          SELECT 1 FROM accounting_journal_entries entry
          WHERE entry.source_transaction_id = tx.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM accounting_journal_entries entry
          INNER JOIN accounting_journal_lines line ON line.entry_id = entry.id
          INNER JOIN accounting_accounts account ON account.id = line.account_id
          WHERE entry.source_transaction_id = tx.id
            AND account.code = 'COST_OF_GOODS_SOLD'
        )
    `);
    await queryRunner.query(`
      UPDATE transaction_items item
      INNER JOIN transactions tx ON tx.id = item.transaction_id
      INNER JOIN (
        SELECT package_item.package_id, SUM(product.purchase_cost_minor) AS unit_cost_minor
        FROM package_items package_item
        INNER JOIN products product ON product.id = package_item.product_id
        WHERE package_item.item_kind = 'PRODUCT'
        GROUP BY package_item.package_id
      ) package_cost ON package_cost.package_id = item.package_id
      SET item.cost_of_goods_sold_minor = item.quantity * package_cost.unit_cost_minor
      WHERE item.item_type = 'PACKAGE'
        AND tx.cost_of_goods_sold_minor = 0
        AND EXISTS (
          SELECT 1 FROM accounting_journal_entries entry
          WHERE entry.source_transaction_id = tx.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM accounting_journal_entries entry
          INNER JOIN accounting_journal_lines line ON line.entry_id = entry.id
          INNER JOIN accounting_accounts account ON account.id = line.account_id
          WHERE entry.source_transaction_id = tx.id
            AND account.code = 'COST_OF_GOODS_SOLD'
        )
    `);
    await queryRunner.query(`
      UPDATE transactions tx
      SET tx.cost_of_goods_sold_minor = (
        SELECT COALESCE(SUM(item.cost_of_goods_sold_minor), 0)
        FROM transaction_items item
        WHERE item.transaction_id = tx.id
      )
      WHERE tx.cost_of_goods_sold_minor = 0
        AND EXISTS (
          SELECT 1 FROM accounting_journal_entries entry
          WHERE entry.source_transaction_id = tx.id
        )
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, account.id, tx.cost_of_goods_sold_minor, 0
      FROM transactions tx
      INNER JOIN accounting_journal_entries entry ON entry.source_transaction_id = tx.id
      INNER JOIN accounting_accounts account ON account.code = 'COST_OF_GOODS_SOLD'
      WHERE tx.cost_of_goods_sold_minor > 0
        AND NOT EXISTS (
          SELECT 1
          FROM accounting_journal_lines existing_line
          INNER JOIN accounting_accounts existing_account ON existing_account.id = existing_line.account_id
          WHERE existing_line.entry_id = entry.id
            AND existing_account.code = 'COST_OF_GOODS_SOLD'
        )
      UNION ALL
      SELECT UUID(), entry.id, account.id, 0, tx.cost_of_goods_sold_minor
      FROM transactions tx
      INNER JOIN accounting_journal_entries entry ON entry.source_transaction_id = tx.id
      INNER JOIN accounting_accounts account ON account.code = 'INVENTORY'
      WHERE tx.cost_of_goods_sold_minor > 0
        AND NOT EXISTS (
          SELECT 1
          FROM accounting_journal_lines existing_line
          INNER JOIN accounting_accounts existing_account ON existing_account.id = existing_line.account_id
          WHERE existing_line.entry_id = entry.id
            AND existing_account.code = 'COST_OF_GOODS_SOLD'
        )
    `);
    await queryRunner.query(`
      SET @inventory_opening_delta =
        (SELECT COALESCE(SUM(products.stock * products.purchase_cost_minor), 0) FROM products)
        - (SELECT COALESCE(SUM(CAST(line.debit_minor AS DECIMAL(65,0))
                               - CAST(line.credit_minor AS DECIMAL(65,0))), 0)
           FROM accounting_journal_lines line
           INNER JOIN accounting_accounts account ON account.id = line.account_id
           WHERE account.code = 'INVENTORY')
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_entries
        (id, entry_type, entry_date, memo, reference, created_by)
      SELECT '00000000-0000-4000-8000-000000000030', 'OPENING_BALANCE', CURRENT_DATE,
             'Inventory valuation transition adjustment', 'MIGRATION-1700000000030', 'system'
      WHERE @inventory_opening_delta <> 0
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, inventory.id,
             GREATEST(@inventory_opening_delta, 0), GREATEST(-@inventory_opening_delta, 0)
      FROM accounting_journal_entries entry
      INNER JOIN accounting_accounts inventory ON inventory.code = 'INVENTORY'
      WHERE entry.id = '00000000-0000-4000-8000-000000000030'
      UNION ALL
      SELECT UUID(), entry.id, equity.id,
             GREATEST(-@inventory_opening_delta, 0), GREATEST(@inventory_opening_delta, 0)
      FROM accounting_journal_entries entry
      INNER JOIN accounting_accounts equity ON equity.code = 'OPENING_BALANCE_EQUITY'
      WHERE entry.id = '00000000-0000-4000-8000-000000000030'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    throw new Error(
      'This migration is forward-only because it posts estimated historical inventory values.',
    );
  }
}
