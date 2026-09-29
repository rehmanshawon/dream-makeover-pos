import { describe, expect, it } from '@jest/globals';
import { databaseConfig } from '../src/config/database.config';
import { CostRevaluation } from '../src/inventory/cost-revaluation.entity';
import { SupplierReturn } from '../src/purchases/supplier-return.entity';
import { SupplierReturnLine } from '../src/purchases/supplier-return-line.entity';
import { SalesReturn } from '../src/returns/sales-return.entity';
import { SalesReturnLine } from '../src/returns/sales-return-line.entity';

describe('databaseConfig', () => {
  it('registers entities queried directly from the DataSource', () => {
    expect(databaseConfig.entities).toEqual(
      expect.arrayContaining([
        SalesReturn,
        SalesReturnLine,
        SupplierReturn,
        SupplierReturnLine,
        CostRevaluation,
      ]),
    );
  });
});
