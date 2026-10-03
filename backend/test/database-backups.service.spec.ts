import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createRequire } from 'node:module';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { DatabaseBackupsService } from '../src/database-backups/database-backups.service';

const runtimeRequire = createRequire(
  join(process.cwd(), 'backend', 'test', 'database-backups.service.spec.ts'),
);
const unzipper = runtimeRequire('unzipper') as typeof import('unzipper');

describe('DatabaseBackupsService', () => {
  let directory: string;
  let dataSource: { runMigrations: jest.Mock };
  let service: DatabaseBackupsService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'dream-makeover-backup-test-'));
    dataSource = { runMigrations: jest.fn() };
    service = new DatabaseBackupsService(dataSource as unknown as DataSource);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('rejects a non-ZIP file before touching the database', async () => {
    const backupPath = join(directory, 'invalid.zip');
    await writeFile(backupPath, 'not a zip archive');

    await expect(service.restore(backupPath)).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.runMigrations).not.toHaveBeenCalled();
  });

  it('creates a ZIP containing the SQL dump and manifest', async () => {
    jest.spyOn(process, 'cwd').mockReturnValue(directory);
    const categoryIconsPath = join(directory, 'uploads', 'category-icons');
    await mkdir(categoryIconsPath, { recursive: true });
    await writeFile(join(categoryIconsPath, 'custom.png'), 'icon-data');
    const writeDump = jest
      .spyOn(
        service as unknown as { writeDatabaseDump(path: string): Promise<void> },
        'writeDatabaseDump',
      )
      .mockImplementation(async (path) => writeFile(path, 'CREATE TABLE sample (id INT);'));
    const response = new PassThrough() as PassThrough & {
      setHeader: jest.Mock;
      headersSent: boolean;
    };
    response.setHeader = jest.fn();
    response.headersSent = false;
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => chunks.push(chunk));

    await service.download(response as unknown as Response);

    const archive = await unzipper.Open.buffer(Buffer.concat(chunks));
    expect(archive.files.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        'manifest.json',
        'database.sql',
        'uploads/category-icons/custom.png',
      ]),
    );
    const sql = archive.files.find((entry) => entry.path === 'database.sql');
    const manifestEntry = archive.files.find((entry) => entry.path === 'manifest.json');
    expect(JSON.parse((await manifestEntry?.buffer())?.toString('utf8') ?? '{}').version).toBe(2);
    expect((await sql?.buffer())?.toString('utf8')).toBe('CREATE TABLE sample (id INT);');
      const icon = archive.files.find((entry) => entry.path === 'uploads/category-icons/custom.png');
      expect((await icon?.buffer())?.toString('utf8')).toBe('icon-data');
    expect(writeDump).toHaveBeenCalledTimes(1);
  });
});
