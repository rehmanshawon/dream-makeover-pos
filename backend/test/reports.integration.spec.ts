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
import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { SalonService } from '../src/services/service.entity';
import { Customer } from '../src/customers/customer.entity';
import { Expense } from '../src/expenses/expense.entity';
import { ExpenseCategory } from '../src/expenses/expense-category.enum';
import { TransactionItemType } from '../src/transactions/transaction-item.entity';
import { Employee } from '../src/employees/employee.entity';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod as SalaryMethod } from '../src/salary-payments/payment-method.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Reports (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;
  let productId: string;
  let serviceId: string;
  let customerId: string;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'reports_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Reports Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'reports_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Reports Staff',
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

    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Reports Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 50,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 100000,
        minimumStockThreshold: 5,
      }),
    );
    productId = product.id;

    const serviceRepo = dataSource.getRepository(SalonService);
    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Reports Facial',
        priceMinor: 200000,
        durationMinutes: 60,
        rewardPointWeight: 1,
        active: true,
      }),
    );
    serviceId = service.id;

    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Reports Customer',
        phoneNumber: '01300000000',
      }),
    );
    customerId = customer.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  const performSale = async (): Promise<void> => {
    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { itemType: TransactionItemType.PRODUCT, itemId: productId, quantity: 3 },
          { itemType: TransactionItemType.SERVICE, itemId: serviceId, quantity: 1 },
        ],
        customerId,
        discountMinor: 0,
        cashReceivedMinor: 1000000,
      })
      .expect(201);
  };

  it('rejects STAFF from trend report', async () => {
    await request(app.getHttpServer())
      .get('/reports/revenue-trend')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('revenue trend includes today with non-zero revenue', async () => {
    await performSale();

    const response = await request(app.getHttpServer())
      .get(`/reports/revenue-trend?range=custom&from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3 * 100000 + 1 * 200000 = 500000
    expect(response.body.points).toHaveLength(1);
    expect(response.body.points[0].date).toBe(todayStr);
    expect(response.body.points[0].revenueMinor).toBe(500000);
    expect(response.body.points[0].transactionCount).toBe(1);
  });

  it('revenue trend fills empty days with zero', async () => {
    await performSale();

    // Request a 3-day range: yesterday, today, tomorrow.
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const response = await request(app.getHttpServer())
      .get(`/reports/revenue-trend?range=custom&from=${fmt(yesterday)}&to=${fmt(tomorrow)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.points).toHaveLength(3);
    expect(response.body.points[0].revenueMinor).toBe(0); // yesterday
    expect(response.body.points[1].revenueMinor).toBe(500000); // today
    expect(response.body.points[2].revenueMinor).toBe(0); // tomorrow
  });

  it('top products returns the sold product with correct aggregates', async () => {
    await performSale();

    const response = await request(app.getHttpServer())
      .get(`/reports/top-products?range=custom&from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemName).toBe('Reports Lipstick');
    expect(response.body.items[0].quantitySold).toBe(3);
    expect(response.body.items[0].revenueMinor).toBe(300000);
  });

  it('top services returns the sold service with correct aggregates', async () => {
    await performSale();

    const response = await request(app.getHttpServer())
      .get(`/reports/top-services?range=custom&from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemName).toBe('Reports Facial');
    expect(response.body.items[0].quantitySold).toBe(1);
    expect(response.body.items[0].revenueMinor).toBe(200000);
  });

  it('top products respects the limit parameter', async () => {
    // Create a second product and sell it
    const productRepo = dataSource.getRepository(Product);
    const second = await productRepo.save(
      productRepo.create({
        name: 'Second Product',
        category: ProductCategory.COSMETICS,
        stock: 20,
        purchaseCostMinor: 30000,
        sellingPriceMinor: 80000,
        minimumStockThreshold: 5,
      }),
    );

    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { itemType: TransactionItemType.PRODUCT, itemId: productId, quantity: 5 },
          { itemType: TransactionItemType.PRODUCT, itemId: second.id, quantity: 1 },
        ],
        customerId,
        discountMinor: 0,
        cashReceivedMinor: 1000000,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/reports/top-products?range=custom&from=${todayStr}&to=${todayStr}&limit=1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    // Reports Lipstick sold 5 units, Second Product sold 1, so Lipstick is first
    expect(response.body.items[0].itemName).toBe('Reports Lipstick');
  });

  it('expense breakdown includes salary and shop expenses', async () => {
    const employeeRepo = dataSource.getRepository(Employee);
    const employee = await employeeRepo.save(
      employeeRepo.create({
        fullName: 'Breakdown Employee',
        role: 'Stylist',
        salaryMinor: 3000000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
      }),
    );

    const salaryRepo = dataSource.getRepository(SalaryPayment);
    await salaryRepo.save(
      salaryRepo.create({
        employeeId: employee.id,
        amountMinor: 3000000,
        paymentType: SalaryPaymentType.REGULAR,
        paymentMethod: SalaryMethod.CASH,
        paidOn: todayStr,
        note: null,
        paidBy: 'reports_admin',
      }),
    );

    const expenseRepo = dataSource.getRepository(Expense);
    await expenseRepo.save([
      expenseRepo.create({
        category: ExpenseCategory.ELECTRICITY,
        amountMinor: 250000,
        expenseDate: todayStr,
        paymentMethod: 'CASH',
        payee: 'DESCO',
        reference: null,
        note: null,
        createdBy: 'reports_admin',
      }),
      expenseRepo.create({
        category: ExpenseCategory.CLEANING,
        amountMinor: 50000,
        expenseDate: todayStr,
        paymentMethod: 'CASH',
        payee: null,
        reference: null,
        note: null,
        createdBy: 'reports_admin',
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get(`/reports/expense-breakdown?range=custom&from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.salaryPaymentsMinor).toBe(3000000);
    expect(response.body.categories).toHaveLength(2);

    const electricity = response.body.categories.find(
      (c: { category: string }) => c.category === 'ELECTRICITY',
    );
    const cleaning = response.body.categories.find(
      (c: { category: string }) => c.category === 'CLEANING',
    );

    expect(electricity.amountMinor).toBe(250000);
    expect(electricity.count).toBe(1);
    expect(cleaning.amountMinor).toBe(50000);
    expect(cleaning.count).toBe(1);

    // Total = 3000000 + 250000 + 50000 = 3300000
    expect(response.body.totalMinor).toBe(3300000);
  });
});
