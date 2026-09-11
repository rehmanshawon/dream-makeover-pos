import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Package } from '../packages/package.entity';
import { PackageItem } from '../packages/package-item.entity';
import { migrations } from '../database/migrations';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'dream_app',
  password: process.env.DB_PASSWORD ?? 'change_me',
  database: process.env.DB_DATABASE ?? 'dream_makeover',
  entities: [Customer, Product, SalonService, Transaction, TransactionItem, Package, PackageItem],
  migrations,
  synchronize: false,
  logging: true,
});
