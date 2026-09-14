import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath =
  typeof __dirname === 'string'
    ? resolve(__dirname, '../../.env')
    : [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'backend/.env')].find(existsSync);

// Resolve the backend env file from the module or workspace so startup is cwd-independent.
if (envPath) {
  config({ path: envPath });
} else {
  config();
}
