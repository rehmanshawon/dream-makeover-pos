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
import { Employee } from '../src/employees/employee.entity';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Salary Payments (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;
  let employeeId: string;

  const seedUsers = async (): Promise<void> => {
    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'sp_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'SP Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'sp_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'SP Staff',
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

  const seedEmployee = async (): Promise<string> => {
    const repo = dataSource.getRepository(Employee);
    const employee = await repo.save(
      repo.create({
        fullName: 'Payable Employee',
        role: 'Stylist',
        salaryMinor: 3500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
      }),
    );
    return employee.id;
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
    employeeId = await seedEmployee();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('rejects STAFF from recording a payment', async () => {
    await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        employeeId,
        amountMinor: 3500000,
        paidOn: '2026-01-31',
      })
      .expect(403);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/salary-payments').expect(401);
  });

  it('records a REGULAR payment with defaults', async () => {
    const response = await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId,
        amountMinor: 3500000,
        paidOn: '2026-01-31',
      })
      .expect(201);

    expect(response.body.paymentType).toBe(SalaryPaymentType.REGULAR);
    expect(response.body.paymentMethod).toBe(PaymentMethod.CASH);
    expect(response.body.amountMinor).toBe(3500000);
    expect(response.body.paidBy).toBe('sp_admin');
  });

  it('records a BONUS payment with a note', async () => {
    const response = await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId,
        amountMinor: 500000,
        paymentType: SalaryPaymentType.BONUS,
        paymentMethod: PaymentMethod.MOBILE,
        paidOn: '2026-01-31',
        note: 'Eid bonus',
      })
      .expect(201);

    expect(response.body.paymentType).toBe(SalaryPaymentType.BONUS);
    expect(response.body.paymentMethod).toBe(PaymentMethod.MOBILE);
    expect(response.body.note).toBe('Eid bonus');
  });

  it('rejects a payment for an unknown employee', async () => {
    await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: '00000000-0000-0000-0000-000000000000',
        amountMinor: 100000,
        paidOn: '2026-01-31',
      })
      .expect(404);
  });

  it('lists payments for an employee, newest first', async () => {
    await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, amountMinor: 1000000, paidOn: '2026-01-01' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, amountMinor: 2000000, paidOn: '2026-02-01' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/salary-payments/employee/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(list.body).toHaveLength(2);
    expect(list.body[0].paidOn).toBe('2026-02-01');
    expect(list.body[1].paidOn).toBe('2026-01-01');
  });

  it('deletes a payment by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/salary-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, amountMinor: 1000000, paidOn: '2026-01-01' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/salary-payments/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const repo = dataSource.getRepository(SalaryPayment);
    const remaining = await repo.find({ where: { employeeId } });
    expect(remaining).toHaveLength(0);
  });
});
