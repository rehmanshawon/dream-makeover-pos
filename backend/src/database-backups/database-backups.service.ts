import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createReadStream, createWriteStream } from 'node:fs';
import { cp, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { finished, pipeline } from 'node:stream/promises';
import type { Response } from 'express';
import type { Archiver, ArchiverOptions } from 'archiver';
import type * as Unzipper from 'unzipper';
import { DataSource } from 'typeorm';

const BACKUP_FORMAT = 'dream-makeover-pos-backup';
const BACKUP_VERSION = 1;
const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 4 * 1024 * 1024 * 1024;
const runtimeRequire = createRequire(
  typeof __filename === 'string' ? __filename : join(process.cwd(), 'backend', 'package.json'),
);
const createArchive = runtimeRequire('archiver') as (
  format: 'zip',
  options: ArchiverOptions,
) => Archiver;
const unzipper = runtimeRequire('unzipper') as typeof import('unzipper');

interface BackupManifest {
  format: string;
  version: number;
  createdAt: string;
  databaseSha256: string;
}

@Injectable()
export class DatabaseBackupsService {
  constructor(private readonly dataSource: DataSource) {}

  async download(response: Response): Promise<void> {
    const workDir = await mkdtemp(join(tmpdir(), 'dream-makeover-backup-'));
    const sqlPath = join(workDir, 'database.sql');
    const manifestPath = join(workDir, 'manifest.json');
    const employeePhotosPath = join(process.cwd(), 'uploads', 'employees');

    try {
      await this.writeDatabaseDump(sqlPath);
      await mkdir(employeePhotosPath, { recursive: true });
      const manifest: BackupManifest = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        databaseSha256: await this.fileSha256(sqlPath),
      };
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      response.setHeader('Content-Type', 'application/zip');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="dream-makeover-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
      );

      const archive = createArchive('zip', { zlib: { level: 6 } });
      const responseFinished = finished(response);
      archive.on('warning', (error) => archive.destroy(error));
      archive.on('error', (error) => archive.destroy(error));
      archive.pipe(response);
      archive.file(manifestPath, { name: 'manifest.json' });
      archive.file(sqlPath, { name: 'database.sql' });
      archive.directory(employeePhotosPath, 'uploads/employees');
      await archive.finalize();
      await responseFinished;
    } catch (error) {
      if (!response.headersSent) {
        throw new InternalServerErrorException(this.errorMessage(error));
      }
      response.destroy(error instanceof Error ? error : undefined);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  async restore(archivePath: string): Promise<void> {
    const archiveStats = await stat(archivePath);
    if (archiveStats.size > MAX_ARCHIVE_BYTES) {
      throw new BadRequestException('Backup file exceeds the 2 GB size limit.');
    }

    const workDir = await mkdtemp(join(tmpdir(), 'dream-makeover-restore-'));
    const sqlPath = join(workDir, 'database.sql');
    const incomingPhotosPath = join(workDir, 'uploads', 'employees');
    const rollbackSqlPath = join(workDir, 'rollback.sql');
    const rollbackPhotosPath = join(workDir, 'rollback-photos');
    const livePhotosPath = join(process.cwd(), 'uploads', 'employees');
    let importStarted = false;

    try {
      await mkdir(incomingPhotosPath, { recursive: true });
      const manifest = await this.extractAndValidate(archivePath, workDir, sqlPath);
      if (manifest.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION) {
        throw new BadRequestException('This backup format is not supported by this version.');
      }
      if ((await this.fileSha256(sqlPath)) !== manifest.databaseSha256) {
        throw new BadRequestException('Backup data failed its integrity check.');
      }

      await this.writeDatabaseDump(rollbackSqlPath);
      await cp(livePhotosPath, rollbackPhotosPath, { recursive: true, force: true }).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
          return mkdir(rollbackPhotosPath, { recursive: true });
        },
      );

      importStarted = true;
      await this.importDatabaseDump(sqlPath);
      await this.dataSource.runMigrations({ transaction: 'all' });
      await this.replaceEmployeePhotos(incomingPhotosPath, livePhotosPath);
    } catch (error) {
      if (importStarted) {
        try {
          await this.importDatabaseDump(rollbackSqlPath);
          await this.dataSource.runMigrations({ transaction: 'all' });
          await this.replaceEmployeePhotos(rollbackPhotosPath, livePhotosPath);
        } catch (rollbackError) {
          throw new InternalServerErrorException(
            `Restore failed and automatic rollback also failed: ${this.errorMessage(rollbackError)}`,
          );
        }
      }
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Restore failed: ${this.errorMessage(error)}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async extractAndValidate(
    archivePath: string,
    workDir: string,
    sqlPath: string,
  ): Promise<BackupManifest> {
    let directory: Unzipper.CentralDirectory;
    try {
      directory = await unzipper.Open.file(archivePath);
    } catch {
      throw new BadRequestException('The selected file is not a valid backup archive.');
    }

    let manifestEntry: Unzipper.File | undefined;
    let sqlEntry: Unzipper.File | undefined;
    let expandedBytes = 0;
    const seenPaths = new Set<string>();
    for (const entry of directory.files) {
      const entryPath = entry.path;
      const parts = entryPath.split('/');
      if (
        entryPath.startsWith('/') ||
        entryPath.includes('\\') ||
        parts.some((part: string) => part === '..' || part === '.')
      ) {
        throw new BadRequestException('Backup archive contains an unsafe file path.');
      }
      if (seenPaths.has(entryPath)) {
        throw new BadRequestException('Backup archive contains duplicate paths.');
      }
      seenPaths.add(entryPath);
      expandedBytes += entry.uncompressedSize;
      if (expandedBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new BadRequestException('Backup archive expands beyond the 4 GB limit.');
      }
      if (entry.type !== 'File' && entry.type !== 'Directory') {
        throw new BadRequestException('Backup archive contains an unsupported entry type.');
      }
      if (entry.type === 'Directory') continue;

      if (entryPath === 'manifest.json') {
        manifestEntry = entry;
      } else if (entryPath === 'database.sql') {
        sqlEntry = entry;
      } else if (entryPath.startsWith('uploads/employees/')) {
        const relativePath = entryPath.slice('uploads/employees/'.length);
        if (!relativePath || relativePath.includes('/')) {
          throw new BadRequestException('Backup contains an invalid employee photo path.');
        }
        const destination = join(workDir, 'uploads', 'employees', basename(relativePath));
        await pipeline(entry.stream(), createWriteStream(destination, { flags: 'wx' }));
      } else {
        throw new BadRequestException(`Backup contains an unexpected file: ${entryPath}`);
      }
    }

    if (!manifestEntry || !sqlEntry) {
      throw new BadRequestException('Backup archive is missing required files.');
    }
    if (manifestEntry.uncompressedSize > 16 * 1024 || sqlEntry.uncompressedSize === 0) {
      throw new BadRequestException('Backup archive contains invalid required files.');
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse((await manifestEntry.buffer()).toString('utf8')) as BackupManifest;
    } catch {
      throw new BadRequestException('Backup manifest is invalid.');
    }
    await pipeline(sqlEntry.stream(), createWriteStream(sqlPath, { flags: 'wx' }));
    return manifest;
  }

  private async writeDatabaseDump(outputPath: string): Promise<void> {
    const config = this.mysqlConfig();
    const dumpExecutable = process.env.MYSQLDUMP_PATH ?? 'mysqldump';
    const args = [
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--user=${config.username}`,
      '--default-character-set=utf8mb4',
      '--single-transaction',
      '--skip-lock-tables',
      '--set-gtid-purged=OFF',
      '--no-tablespaces',
      '--quick',
      '--triggers',
      '--hex-blob',
      config.database,
    ];
    const help = spawnSync(dumpExecutable, ['--help'], { encoding: 'utf8' });
    if (help.error) throw help.error;
    if (help.stdout.includes('--masking-policies'))
      args.splice(args.length - 1, 0, '--skip-masking-policies');

    const child = spawn(dumpExecutable, args, {
      env: { ...process.env, MYSQL_PWD: config.password },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const errorOutput = this.captureStderr(child);
    const exitCode = this.waitForClose(child);
    try {
      await pipeline(child.stdout, createWriteStream(outputPath, { flags: 'wx' }));
      const code = await exitCode;
      if (code !== 0) {
        throw new Error(errorOutput() || `mysqldump exited with code ${code}`);
      }
    } catch (error) {
      child.kill();
      throw error;
    }
  }

  private async importDatabaseDump(sqlPath: string): Promise<void> {
    const config = this.mysqlConfig();
    const args = [
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--user=${config.username}`,
      '--default-character-set=utf8mb4',
      `--database=${config.database}`,
    ];
    const child = spawn(process.env.MYSQL_PATH ?? 'mysql', args, {
      env: { ...process.env, MYSQL_PWD: config.password },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    const errorOutput = this.captureStderr(child);
    const exitCode = this.waitForClose(child);
    try {
      await this.clearCurrentSchema(child.stdin);
      await pipeline(createReadStream(sqlPath), child.stdin);
      const code = await exitCode;
      if (code !== 0) {
        throw new Error(errorOutput() || `mysql exited with code ${code}`);
      }
    } catch (error) {
      child.kill();
      throw error;
    }
  }

  private async clearCurrentSchema(input: NodeJS.WritableStream): Promise<void> {
    const config = this.mysqlConfig();
    const objects = (await this.dataSource.query(
      'SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema = ?',
      [config.database],
    )) as { name: string; type: string }[];
    const quoteName = (name: string): string => `\`${name.replace(/`/g, '``')}\``;
    const views = objects.filter((object) => object.type === 'VIEW');
    const tables = objects.filter((object) => object.type === 'BASE TABLE');
    input.write('SET FOREIGN_KEY_CHECKS=0;\n');
    for (const view of views) {
      input.write(`DROP VIEW IF EXISTS ${quoteName(view.name)};\n`);
    }
    for (const table of tables) {
      input.write(`DROP TABLE IF EXISTS ${quoteName(table.name)};\n`);
    }
    input.write('SET FOREIGN_KEY_CHECKS=1;\n');
  }

  private async replaceEmployeePhotos(sourcePath: string, destinationPath: string): Promise<void> {
    await rm(destinationPath, { recursive: true, force: true });
    await mkdir(destinationPath, { recursive: true });
    await cp(sourcePath, destinationPath, { recursive: true, force: true });
  }

  private mysqlConfig(): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  } {
    return {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dream_app',
      password: process.env.DB_PASSWORD ?? 'change_me',
      database: process.env.DB_DATABASE ?? 'dream_makeover',
    };
  }

  private captureStderr(child: ReturnType<typeof spawn>): () => string {
    let output = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      output = `${output}${chunk.toString('utf8')}`.slice(-16_384);
    });
    return () => output.trim();
  }

  private waitForClose(child: ReturnType<typeof spawn>): Promise<number> {
    return new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => resolve(code ?? -1));
    });
  }

  private async fileSha256(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    await pipeline(createReadStream(filePath), hash);
    return hash.digest('hex');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
