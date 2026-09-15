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
import { SalonService } from '../src/services/service.entity';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Salon services (integration)', () => {
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
        username: 'svc_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Svc Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'svc_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Svc Staff',
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

  async function createService(): Promise<string> {
    const repo = dataSource.getRepository(SalonService);
    const service = await repo.save(
      repo.create({
        name: 'Integration Service',
        priceMinor: 200000,
        durationMinutes: 45,
        rewardPointWeight: 1,
        active: true,
      }),
    );
    return service.id;
  }

  it('rejects PATCH from staff', async () => {
    const id = await createService();

    await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priceMinor: 250000 })
      .expect(403);
  });

  it('allows PATCH from admin', async () => {
    const id = await createService();

    const response = await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priceMinor: 250000 })
      .expect(200);

    expect(response.body.priceMinor).toBe(250000);
    expect(response.body.name).toBe('Integration Service');
  });

  it('deactivates a service via PATCH active=false', async () => {
    const id = await createService();

    const response = await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    expect(response.body.active).toBe(false);

    // Active-only listing should now exclude it
    const activeList = await request(app.getHttpServer())
      .get('/services?activeOnly=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(activeList.body).toHaveLength(0);
  });

  it('reactivates a service', async () => {
    const id = await createService();

    await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true })
      .expect(200);

    expect(response.body.active).toBe(true);
  });

  it('rejects attempts to modify an unknown field', async () => {
    const id = await createService();

    await request(app.getHttpServer())
      .patch(`/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rewardPoints: 999 })
      .expect(400);
  });

  it('returns 404 for a missing service', async () => {
    await request(app.getHttpServer())
      .patch('/services/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priceMinor: 100000 })
      .expect(404);
  });
});
