import 'dotenv/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

declare const __dirname: string;

const env =
  (
    globalThis as typeof globalThis & {
      process?: { env: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: env.DB_HOST ?? '127.0.0.1',
  port: Number(env.DB_PORT ?? 3306),
  username: env.DB_USERNAME ?? 'dream_app',
  password: env.DB_PASSWORD ?? 'change_me',
  database: env.DB_DATABASE ?? 'dream_makeover',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: env.NODE_ENV === 'development',
};
