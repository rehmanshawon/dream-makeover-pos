import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPackageIdToTransactionItems1700000000008 implements MigrationInterface {
  name = 'AddPackageIdToTransactionItems1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transaction_items
      ADD COLUMN package_id CHAR(36) NULL AFTER service_id
    `);

    await queryRunner.query(`
      ALTER TABLE transaction_items
      ADD CONSTRAINT fk_transaction_items_package
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE transaction_items
      ADD INDEX idx_transaction_items_package (package_id)
    `);

    // The existing CHECK-like invariant on TransactionItem is enforced at
    // the application layer. MySQL does not currently enforce CHECK for
    // our polymorphic case across three optional FKs, so we do not add
    // one here. The service layer guarantees that exactly one of
    // product_id, service_id, or package_id is set based on item_type.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transaction_items
      DROP FOREIGN KEY fk_transaction_items_package
    `);
    await queryRunner.query(`
      ALTER TABLE transaction_items
      DROP INDEX idx_transaction_items_package
    `);
    await queryRunner.query(`
      ALTER TABLE transaction_items
      DROP COLUMN package_id
    `);
  }
}
