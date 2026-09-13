import { config } from 'dotenv';
import { resolve } from 'node:path';

// Resolve the backend env file from this module so startup does not depend on cwd.
config({ path: resolve(__dirname, '../../.env') });
