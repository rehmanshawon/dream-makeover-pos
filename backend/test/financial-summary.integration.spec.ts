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
import { Employee } from '../src/employees/employee.entity';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod as SalaryPaymentMethod } from '../src/salary-payments/payment-method.enum';
import { Expense } from '../src/expenses/expense.entity';
import { ExpenseCategory } from '../src/expenses/expense-category.enum';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItemType } from '../src/transactions/transaction-item.entity';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Financial Summary (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;

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
        username: 'rep_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Rep Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'rep_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Rep Staff',
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
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('rejects STAFF from viewing the report', async () => {
    await request(app.getHttpServer())
      .get('/reports/financial-summary')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/reports/financial-summary').expect(401);
  });

  it('returns zeros for an empty period', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/financial-summary?range=this_month')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.revenue.totalRevenueMinor).toBe(0);
    expect(response.body.cogsMinor).toBe(0);
    expect(response.body.expenses.totalOperatingExpensesMinor).toBe(0);
    expect(response.body.netOperatingResultMinor).toBe(0);
  });

  it('computes revenue, COGS, expenses, and net result for a period', async () => {
    const productRepo = dataSource.getRepository(Product);
    const serviceRepo = dataSource.getRepository(SalonService);
    const customerRepo = dataSource.getRepository(Customer);
    const employeeRepo = dataSource.getRepository(Employee);
    const salaryRepo = dataSource.getRepository(SalaryPayment);
    const expenseRepo = dataSource.getRepository(Expense);

    const product = await productRepo.save(
      productRepo.create({
        name: 'Report Test Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 20,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 100000,
        minimumStockThreshold: 2,
      }),
    );

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Report Test Facial',
        priceMinor: 200000,
        durationMinutes: 60,
        rewardPointWeight: 1,
        active: true,
      }),
    );

    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Report Customer',
        phoneNumber: '01400000000',
      }),
    );

    // Perform a checkout via API
    const today = new Date().toISOString().slice(0, 10);

    const checkoutResponse = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { itemType: TransactionItemType.PRODUCT, itemId: product.id, quantity: 2 },
          { itemType: TransactionItemType.SERVICE, itemId: service.id, quantity: 1 },
        ],
        customerId: customer.id,
        discountMinor: 5000,
        cashReceivedMinor: 500000,
      })
      .expect(201);

    expect(checkoutResponse.body.totalMinor).toBe(395000);
    // Subtotal = 2 * 100000 + 200000 = 400000. Discount 5000. Total 395000.

    // Record a salary payment
    const employee = await employeeRepo.save(
      employeeRepo.create({
        fullName: 'Report Employee',
        role: 'Stylist',
        salaryMinor: 3000000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
      }),
    );

    await salaryRepo.save(
      salaryRepo.create({
        employeeId: employee.id,
        amountMinor: 3000000,
        paymentType: SalaryPaymentType.REGULAR,
        paymentMethod: SalaryPaymentMethod.CASH,
        paidOn: today,
        note: null,
        paidBy: 'rep_admin',
      }),
    );

    // Record an expense
    await expenseRepo.save(
      expenseRepo.create({
        category: ExpenseCategory.ELECTRICITY,
        amountMinor: 250000,
        expenseDate: today,
        paymentMethod: 'CASH',
        payee: 'DESCO',
        reference: null,
        note: null,
        createdBy: 'rep_admin',
      }),
    );

    const response = await request(app.getHttpServer())
      .get(`/reports/financial-summary?range=custom&from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Revenue = 2*100000 + 200000 = 400000 (pre-discount per item breakdown)
    expect(response.body.revenue.productSalesMinor).toBe(200000);
    expect(response.body.revenue.serviceSalesMinor).toBe(200000);
    expect(response.body.revenue.packageSalesMinor).toBe(0);
    // Total revenue (post-discount) = 395000
    expect(response.body.revenue.totalRevenueMinor).toBe(395000);
    // Discounts
    expect(response.body.discountsGivenMinor).toBe(5000);

    // COGS = 2 * 50000 = 100000
    expect(response.body.cogsMinor).toBe(100000);

    // Gross profit = 395000 - 100000 = 295000
    expect(response.body.grossProfitMinor).toBe(295000);

    // Expenses
    expect(response.body.expenses.salaryPaymentsMinor).toBe(3000000);
    expect(response.body.expenses.shopExpensesMinor).toBe(250000);
    expect(response.body.expenses.totalOperatingExpensesMinor).toBe(3250000);

    // Net operating result = 295000 - 3250000 = -2955000
    expect(response.body.netOperatingResultMinor).toBe(-2955000);

    // Metadata
    expect(response.body.metadata.cogsMethod).toBe('current_purchase_cost');
    expect(response.body.metadata.generatedAt).toBeDefined();
  });
});
