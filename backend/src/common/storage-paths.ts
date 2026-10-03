import { resolve } from 'node:path';

export function getUploadsDirectory(): string {
  return process.env.UPLOADS_DIR
    ? resolve(process.env.UPLOADS_DIR)
    : resolve(process.cwd(), 'uploads');
}