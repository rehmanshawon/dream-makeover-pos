import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { Product } from '../src/products/product.entity';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { JournalLine } from '../src/accounting/journal-line.entity';
import { Purchase } from '../src/purchases/purchase.entity';
import { TimeTrustGuard } from '../src/time-trust/time-trust.guard';
import {
  createTestDataSource,
  TEST_PRODUCT_CATEGORY_ID,
  truncateAllTables,
} from './helpers/test-data-source';

describe('Purchases (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let product: Product;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .overrideGuard(TimeTrustGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.save(
      userRepo.create({
        username: 'purchase_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Purchase Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    adminToken = await jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    product = await dataSource.getRepository(Product).save(
      dataSource.getRepository(Product).create({
        name: 'Purchase Test Serum',
        categoryId: TEST_PRODUCT_CATEGORY_ID,
        stock: 5,
        purchaseCostMinor: 1000,
        sellingPriceMinor: 5000,
        minimumStockThreshold: 1,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('receives stock at weighted-average cost and posts cash and credit purchases', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    await request(app.getHttpServer())
      .post('/purchases')
      .set(auth)
      .send({
        purchaseDate: '2026-09-28',
        supplierName: 'Supplier One',
        paymentMethod: 'CASH',
        lines: [{ productId: product.id, quantity: 2, unitCostMinor: 3000 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/purchases')
      .set(auth)
      .send({
        purchaseDate: '2026-09-28',
        supplierName: 'Supplier One',
        paymentMethod: 'CREDIT',
        lines: [{ productId: product.id, quantity: 3, unitCostMinor: 5000 }],
      })
      .expect(201);

    const updated = await dataSource.getRepository(Product).findOneByOrFail({ id: product.id });
    expect(updated.stock).toBe(10);
    expect(updated.purchaseCostMinor).toBe(2600);

    const entries = await dataSource.getRepository(JournalEntry).find({
      where: { entryType: JournalEntryType.PURCHASE },
    });
    expect(entries).toHaveLength(2);
    const lines = await dataSource.getRepository(JournalLine).find({
      where: entries.map((entry) => ({ entryId: entry.id })),
      relations: { account: true },
    });
    expect(lines.reduce((sum, line) => sum + line.debitMinor, 0)).toBe(21000);
    expect(lines.reduce((sum, line) => sum + line.creditMinor, 0)).toBe(21000);
    expect(lines.filter((line) => line.account.code === 'INVENTORY')).toHaveLength(2);
    expect(lines.filter((line) => line.account.code === 'CASH')).toHaveLength(1);
    expect(lines.filter((line) => line.account.code === 'ACCOUNTS_PAYABLE')).toHaveLength(1);
  });

  it('rolls back purchase records when a referenced product does not exist', async () => {
    await request(app.getHttpServer())
      .post('/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseDate: '2026-09-28',
        paymentMethod: 'CASH',
        lines: [
          {
            productId: '99999999-9999-4999-8999-999999999999',
            quantity: 1,
            unitCostMinor: 2500,
          },
        ],
      })
      .expect(400);

    expect(await dataSource.getRepository(Purchase).count()).toBe(0);
    expect(await dataSource.getRepository(JournalEntry).count()).toBe(0);
  });
});
