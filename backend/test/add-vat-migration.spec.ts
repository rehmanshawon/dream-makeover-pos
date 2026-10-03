import { describe, expect, it, jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { AddVatToTransactions1700000000017 } from '../src/database/migrations/1700000000017-AddVatToTransactions';

describe('AddVatToTransactions migration', () => {
  function createQueryRunner() {
    const hasColumn = jest.fn<(table: string, column: string) => Promise<boolean>>();
    const query = jest.fn<(sql: string) => Promise<unknown>>();
    return {
      hasColumn,
      query,
      runner: { hasColumn, query } as unknown as QueryRunner,
    };
  }

  it('does not re-add VAT columns already present in the initial schema', async () => {
    const { hasColumn, query, runner } = createQueryRunner();
    hasColumn.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await new AddVatToTransactions1700000000017().up(runner);

    expect(query).not.toHaveBeenCalled();
  });

  it('adds both VAT columns when neither is present', async () => {
    const { hasColumn, query, runner } = createQueryRunner();
    hasColumn.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    await new AddVatToTransactions1700000000017().up(runner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('ADD COLUMN vat_rate_percent');
    expect(query.mock.calls[1]?.[0]).toContain('ADD COLUMN vat_minor');
  });

  it('adds only the missing VAT column when the schema is partially migrated', async () => {
    const { hasColumn, query, runner } = createQueryRunner();
    hasColumn.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await new AddVatToTransactions1700000000017().up(runner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      'ALTER TABLE transactions ADD COLUMN vat_minor BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER vat_rate_percent',
    );
  });
});
