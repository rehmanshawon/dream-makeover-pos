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
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Users (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let adminId: string;
  let staffId: string;

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
        username: 'usr_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'usr_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Staff',
        role: UserRole.STAFF,
        active: true,
      }),
    );
    adminId = admin.id;
    staffId = staff.id;

    adminToken = await jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('updates a staff user as admin', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: 'Updated Staff' })
      .expect(200);

    expect(response.body.displayName).toBe('Updated Staff');
  });

  it('rejects self-deactivation', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(400);
  });

  it('rejects self role change', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: UserRole.STAFF })
      .expect(400);
  });
});
