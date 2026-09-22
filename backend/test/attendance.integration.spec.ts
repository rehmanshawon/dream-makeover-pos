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
import { Employee } from '../src/employees/employee.entity';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Attendance (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let firstEmployeeId: string;
  let secondEmployeeId: string;

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
        username: 'attendance_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Attendance Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    adminToken = await jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });

    const employeeRepo = dataSource.getRepository(Employee);
    const firstEmployee = await employeeRepo.save(
      employeeRepo.create({
        fullName: 'Attendance Employee One',
        role: 'Stylist',
        salaryMinor: 2000000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
      }),
    );
    const secondEmployee = await employeeRepo.save(
      employeeRepo.create({
        fullName: 'Attendance Employee Two',
        role: 'Receptionist',
        salaryMinor: 1500000,
        salaryFrequency: SalaryFrequency.MONTHLY,
        joinDate: '2025-01-01',
      }),
    );
    firstEmployeeId = firstEmployee.id;
    secondEmployeeId = secondEmployee.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('should upsert attendance correctly', async () => {
    const response = await request(app.getHttpServer())
      .put(`/attendance/employee/${firstEmployeeId}/2026-01-01`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PRESENT' })
      .expect(200);

    expect(response.body.employeeId).toBe(firstEmployeeId);
    expect(response.body.status).toBe('PRESENT');
  });

  it('should bulk insert attendance correctly', async () => {
    const response = await request(app.getHttpServer())
      .post(`/attendance/employee/${firstEmployeeId}/bulk`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entries: [
          { date: '2026-01-01', status: 'PRESENT' },
          { date: '2026-01-02', status: 'HALF_DAY' },
        ],
      })
      .expect(201);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].employeeId).toBe(firstEmployeeId);
    expect(response.body[1].status).toBe('HALF_DAY');

    await request(app.getHttpServer())
      .put(`/attendance/employee/${secondEmployeeId}/2026-01-01`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ABSENT' })
      .expect(200);
  });
});
