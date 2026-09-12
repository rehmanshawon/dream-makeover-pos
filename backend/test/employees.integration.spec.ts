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
import { EmployeeStatus } from '../src/employees/employee-status.enum';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Employees (integration)', () => {
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

    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'emp_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Emp Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'emp_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Emp Staff',
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

  beforeEach(async () => {
    await truncateAllTables(dataSource);

    // Re-seed admin/staff since truncate removes them
    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'emp_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Emp Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'emp_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Emp Staff',
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

  it('rejects STAFF from creating an employee', async () => {
    await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        fullName: 'Should Fail',
        role: 'Cleaner',
        salaryMinor: 1500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2026-01-01',
      })
      .expect(403);
  });

  it('rejects STAFF from listing employees', async () => {
    await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/employees').expect(401);
  });

  it('allows ADMIN to create and list employees', async () => {
    const create = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Rina Akter',
        role: 'Senior Stylist',
        salaryMinor: 3500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-06-15',
      })
      .expect(201);

    expect(create.body.status).toBe(EmployeeStatus.ACTIVE);
    expect(create.body.salaryMinor).toBe(3500000);

    const list = await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].fullName).toBe('Rina Akter');
  });

  it('allows ADMIN to update an employee', async () => {
    const create = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Rina Akter',
        role: 'Senior Stylist',
        salaryMinor: 3500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-06-15',
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/employees/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ salaryMinor: 4000000 })
      .expect(200);

    expect(updated.body.salaryMinor).toBe(4000000);
    expect(updated.body.fullName).toBe('Rina Akter');
  });

  it('deactivates via DELETE without removing the row', async () => {
    const create = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Leaving Employee',
        role: 'Cleaner',
        salaryMinor: 1500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2024-01-01',
      })
      .expect(201);

    const deleted = await request(app.getHttpServer())
      .delete(`/employees/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(deleted.body.status).toBe(EmployeeStatus.INACTIVE);

    // Row still exists
    const repo = dataSource.getRepository(Employee);
    const found = await repo.findOne({ where: { id: create.body.id } });
    expect(found).toBeDefined();
    expect(found?.status).toBe(EmployeeStatus.INACTIVE);
  });

  it('filters by status query parameter', async () => {
    const repo = dataSource.getRepository(Employee);
    await repo.save([
      repo.create({
        fullName: 'Active One',
        role: 'Stylist',
        salaryMinor: 3000000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
        status: EmployeeStatus.ACTIVE,
      }),
      repo.create({
        fullName: 'Inactive One',
        role: 'Cleaner',
        salaryMinor: 1500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2024-01-01',
        status: EmployeeStatus.INACTIVE,
      }),
    ]);

    const activeOnly = await request(app.getHttpServer())
      .get('/employees?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(activeOnly.body).toHaveLength(1);
    expect(activeOnly.body[0].fullName).toBe('Active One');
  });
});
