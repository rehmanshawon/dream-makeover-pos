import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { Expense } from '../src/expenses/expense.entity';
import { ExpenseCategory } from '../src/expenses/expense-category.enum';
import { ExpensePaymentMethod } from '../src/expenses/expense-payment-method.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Expenses (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;

  const seedUsers = async (): Promise<void> => {
    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'exp_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Exp Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'exp_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Exp Staff',
        role: UserRole.STAFF,
        active: true,
      }),
    );
    adminToken = await jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });
    staffToken = await jwtService.signAsync({
      sub: staff.id,
      username: staff.username,
      role: staff.role,
    });
  };

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedUsers();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('rejects STAFF from creating an expense', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        category: ExpenseCategory.RENT,
        amountMinor: 5000000,
        expenseDate: '2026-01-01',
      })
      .expect(403);
  });

  it('rejects STAFF from listing expenses', async () => {
    await request(app.getHttpServer())
      .get('/expenses')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/expenses').expect(401);
  });

  it('records an expense with defaults', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: ExpenseCategory.ELECTRICITY,
        amountMinor: 250000,
        expenseDate: '2026-01-15',
      })
      .expect(201);

    expect(response.body.category).toBe(ExpenseCategory.ELECTRICITY);
    expect(response.body.paymentMethod).toBe(ExpensePaymentMethod.CASH);
    expect(response.body.amountMinor).toBe(250000);
    expect(response.body.createdBy).toBe('exp_admin');
  });

  it('records an expense with payee, reference, and note', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: ExpenseCategory.RENT,
        amountMinor: 5000000,
        expenseDate: '2026-01-01',
        paymentMethod: ExpensePaymentMethod.BANK,
        payee: 'Landlord Mr. Rahman',
        reference: 'Receipt #7',
        note: 'January rent',
      })
      .expect(201);

    expect(response.body.payee).toBe('Landlord Mr. Rahman');
    expect(response.body.reference).toBe('Receipt #7');
    expect(response.body.paymentMethod).toBe(ExpensePaymentMethod.BANK);
  });

  it('rejects invalid category value', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'NOT_A_CATEGORY',
        amountMinor: 100000,
        expenseDate: '2026-01-15',
      })
      .expect(400);
  });

  it('rejects non-positive amount', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: ExpenseCategory.MISC,
        amountMinor: 0,
        expenseDate: '2026-01-15',
      })
      .expect(400);
  });

  it('filters by date range', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: ExpenseCategory.WATER, amountMinor: 100000, expenseDate: '2026-01-10' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: ExpenseCategory.WATER, amountMinor: 100000, expenseDate: '2026-02-10' })
      .expect(201);

    const inRange = await request(app.getHttpServer())
      .get('/expenses?from=2026-01-01&to=2026-01-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(inRange.body).toHaveLength(1);
    expect(inRange.body[0].expenseDate).toBe('2026-01-10');
  });

  it('filters by category', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: ExpenseCategory.WATER, amountMinor: 100000, expenseDate: '2026-01-10' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: ExpenseCategory.RENT, amountMinor: 5000000, expenseDate: '2026-01-10' })
      .expect(201);

    const rentOnly = await request(app.getHttpServer())
      .get('/expenses?category=RENT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(rentOnly.body).toHaveLength(1);
    expect(rentOnly.body[0].category).toBe(ExpenseCategory.RENT);
  });

  it('updates an expense partially', async () => {
    const created = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: ExpenseCategory.MISC,
        amountMinor: 50000,
        expenseDate: '2026-01-10',
        note: 'Initial note',
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/expenses/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amountMinor: 75000 })
      .expect(200);

    expect(updated.body.amountMinor).toBe(75000);
    expect(updated.body.note).toBe('Initial note');
    expect(updated.body.category).toBe(ExpenseCategory.MISC);
  });

  it('deletes an expense', async () => {
    const created = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: ExpenseCategory.CLEANING,
        amountMinor: 30000,
        expenseDate: '2026-01-10',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/expenses/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const repo = dataSource.getRepository(Expense);
    const remaining = await repo.count();
    expect(remaining).toBe(0);
  });
});
