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

describe('Auth password change (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let token: string;
  let userId: string;

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
    const user = await userRepo.save(
      userRepo.create({
        username: 'pw_user',
        passwordHash: await bcrypt.hash('old-pass-123', 10),
        displayName: 'PW User',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    userId = user.id;

    token = await jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('changes password on valid input', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-pass-123',
        newPassword: 'new-pass-456',
      })
      .expect(204);

    const userRepo = dataSource.getRepository(User);
    const updated = await userRepo.findOne({ where: { id: userId } });
    expect(updated).not.toBeNull();

    const matches = await bcrypt.compare('new-pass-456', updated!.passwordHash);
    expect(matches).toBe(true);
  });

  it('rejects wrong current password', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'wrong',
        newPassword: 'new-pass-456',
      })
      .expect(401);
  });

  it('rejects new password identical to current', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-pass-123',
        newPassword: 'old-pass-123',
      })
      .expect(400);
  });

  it('rejects new password shorter than 8 characters', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-pass-123',
        newPassword: 'short',
      })
      .expect(400);
  });
});
