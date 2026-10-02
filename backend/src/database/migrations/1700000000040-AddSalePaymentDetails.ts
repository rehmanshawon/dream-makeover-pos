import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSalePaymentDetails1700000000040 implements MigrationInterface {
  name = 'AddSalePaymentDetails1700000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const transactionTable = await queryRunner.getTable('transactions');
    if (!transactionTable) throw new Error('transactions table is missing');

    const paymentMethodColumn = transactionTable.findColumnByName('payment_method');
    const paymentMethods = ['CASH', 'CARD', 'BANK', 'MOBILE'];
    if (!paymentMethodColumn) {
      await queryRunner.addColumn(
        'transactions',
        new TableColumn({
          name: 'payment_method',
          type: 'enum',
          enum: paymentMethods,
          isNullable: false,
          default: "'CASH'",
        }),
      );
    } else if (paymentMethodColumn.type === 'enum') {
      const expandedValues = [...new Set([...(paymentMethodColumn.enum ?? []), ...paymentMethods])];
      if (expandedValues.length !== (paymentMethodColumn.enum ?? []).length) {
        const expandedColumn = paymentMethodColumn.clone();
        expandedColumn.enum = expandedValues;
        await queryRunner.changeColumn('transactions', paymentMethodColumn, expandedColumn);
      }
    }

    if (!(await queryRunner.hasColumn('transactions', 'mobile_wallet_provider'))) {
      await queryRunner.addColumn(
        'transactions',
        new TableColumn({
          name: 'mobile_wallet_provider',
          type: 'enum',
          enum: ['BKASH', 'ROCKET', 'NAGAD', 'OTHER'],
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('transactions', 'payment_reference'))) {
      await queryRunner.addColumn(
        'transactions',
        new TableColumn({
          name: 'payment_reference',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO accounting_accounts (id, code, name, type, is_system)
      SELECT '00000000-0000-4000-8000-000000000033', 'CARD_CLEARING', 'Card clearing receivable', 'ASSET', 1
      WHERE NOT EXISTS (
        SELECT 1 FROM accounting_accounts WHERE code = 'CARD_CLEARING'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM accounting_accounts
      WHERE id = '00000000-0000-4000-8000-000000000033'
        AND code = 'CARD_CLEARING'
        AND NOT EXISTS (
          SELECT 1 FROM accounting_journal_lines
          WHERE accounting_journal_lines.account_id = accounting_accounts.id
        )
    `);
    if (await queryRunner.hasColumn('transactions', 'payment_method')) {
      await queryRunner.dropColumn('transactions', 'payment_method');
    }
    if (await queryRunner.hasColumn('transactions', 'payment_reference')) {
      await queryRunner.dropColumn('transactions', 'payment_reference');
    }
    if (await queryRunner.hasColumn('transactions', 'mobile_wallet_provider')) {
      await queryRunner.dropColumn('transactions', 'mobile_wallet_provider');
    }
  }
}