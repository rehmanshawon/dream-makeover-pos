import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getUploadsDirectory } from './common/storage-paths';
import { User } from './users/user.entity';
import { UserRole } from './users/user-role.enum';

/**
 * Parses the CORS_ALLOWED_ORIGINS env variable into an array.
 *
 * Multiple origins are separated by commas. Whitespace is trimmed.
 * An empty value disables extra configured origins (useful for tests).
 *
 * `null` is a valid entry and allows requests with no Origin header
 * (typically from Electron's file:// context and from non-browser
 * clients like curl).
 */
function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await seedInitialUsers(app);
  const uploadsDirectory = getUploadsDirectory();
  mkdirSync(join(uploadsDirectory, 'employees'), { recursive: true });
  app.useStaticAssets(uploadsDirectory, { prefix: '/uploads/' });

  const allowedOrigins = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    ...parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: [],
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

async function seedInitialUsers(app: NestExpressApplication): Promise<void> {
  const initialPasswords = [
    {
      username: 'admin',
      displayName: 'Admin',
      role: UserRole.ADMIN,
      password: process.env.INITIAL_ADMIN_PASSWORD,
    },
    {
      username: 'staff',
      displayName: 'Staff',
      role: UserRole.STAFF,
      password: process.env.INITIAL_STAFF_PASSWORD,
    },
  ];
  if (initialPasswords.some((user) => !user.password)) return;

  const users = app.get<Repository<User>>(getRepositoryToken(User));
  for (const initialUser of initialPasswords) {
    if (await users.findOneBy({ username: initialUser.username })) continue;
    const user = users.create({
      username: initialUser.username,
      displayName: initialUser.displayName,
      role: initialUser.role,
    });
    await user.setPassword(initialUser.password!);
    await users.save(user);
  }
}

void bootstrap();
