import 'dotenv/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';

const env = process.env;

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: env.DB_HOST ?? '127.0.0.1',
  port: Number(env.DB_PORT ?? 3306),
  username: env.DB_USERNAME ?? 'dream_app',
  password: env.DB_PASSWORD ?? 'change_me',
  database: env.DB_DATABASE ?? 'dream_makeover',
  entities: [Customer, Product, SalonService, Transaction, User],
  synchronize: false,
  logging: env.NODE_ENV === 'development',
};
