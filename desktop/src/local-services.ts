import { app, dialog } from 'electron';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DATABASE_PORT = 3307;
const API_PORT = 3001;
const DATABASE_NAME = 'dream_makeover';
const DATABASE_USER = 'dream_app';

interface DatabaseSettings {
  rootPassword: string;
  appPassword: string;
  jwtSecret: string;
  initialized: boolean;
  initialAdminPassword?: string;
  initialStaffPassword?: string;
  initialCredentialsPending?: boolean;
}

interface MysqlConnection {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
}

interface MysqlModule {
  createConnection(options: Record<string, string | number>): Promise<MysqlConnection>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'ignore' });
    child.once('error', rejectProcess);
    child.once('close', (code) => {
      if (code === 0) resolveProcess();
      else rejectProcess(new Error(`${command} exited with code ${code ?? -1}`));
    });
  });
}

async function openRootConnection(
  mysql: MysqlModule,
  port: number,
  password: string,
): Promise<MysqlConnection> {
  return mysql.createConnection({
    host: '127.0.0.1',
    port,
    user: 'root',
    password,
    connectTimeout: 1500,
  });
}

async function waitForDatabase(
  mysql: MysqlModule,
  rootPassword: string,
  initialized: boolean,
): Promise<MysqlConnection> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const password of initialized ? [rootPassword] : [rootPassword, '']) {
      try {
        return await openRootConnection(mysql, DATABASE_PORT, password);
      } catch (error) {
        lastError = error;
      }
    }
    await delay(500);
  }
  throw new Error(`Bundled MySQL did not become ready: ${String(lastError)}`);
}

function escapeSqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function readOrCreateSettings(settingsPath: string): Promise<DatabaseSettings> {
  try {
    return JSON.parse(await readFile(settingsPath, 'utf8')) as DatabaseSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const settings: DatabaseSettings = {
    rootPassword: randomBytes(32).toString('hex'),
    appPassword: randomBytes(32).toString('hex'),
    jwtSecret: randomBytes(48).toString('hex'),
    initialized: false,
    initialAdminPassword: randomBytes(9).toString('hex'),
    initialStaffPassword: randomBytes(9).toString('hex'),
    initialCredentialsPending: true,
  };
  await writeSettings(settingsPath, settings);
  return settings;
}

async function writeSettings(settingsPath: string, settings: DatabaseSettings): Promise<void> {
  const temporaryPath = `${settingsPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(settings), { mode: 0o600 });
  await rename(temporaryPath, settingsPath);
}

async function prepareDatabase(
  settingsPath: string,
  settings: DatabaseSettings,
  root: MysqlConnection,
): Promise<void> {
  const appPassword = escapeSqlString(settings.appPassword);
  const rootPassword = escapeSqlString(settings.rootPassword);
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await root.query(
    `CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'127.0.0.1' IDENTIFIED BY ${appPassword}`,
  );
  await root.query(`ALTER USER '${DATABASE_USER}'@'127.0.0.1' IDENTIFIED BY ${appPassword}`);
  await root.query(
    `GRANT ALL PRIVILEGES ON \`${DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'127.0.0.1'`,
  );
  await root.query(
    `CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'localhost' IDENTIFIED BY ${appPassword}`,
  );
  await root.query(`ALTER USER '${DATABASE_USER}'@'localhost' IDENTIFIED BY ${appPassword}`);
  await root.query(
    `GRANT ALL PRIVILEGES ON \`${DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'localhost'`,
  );
  await root.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY ${rootPassword}`);
  settings.initialized = true;
  await writeSettings(settingsPath, settings);
}

function logChild(child: ChildProcess, logPath: string): void {
  child.stdout?.on('data', (chunk: Buffer) => void appendFile(logPath, chunk));
  child.stderr?.on('data', (chunk: Buffer) => void appendFile(logPath, chunk));
}

async function startMySql(
  mysqlExecutable: string,
  mysqlBase: string,
  dataPath: string,
  logPath: string,
): Promise<ChildProcess> {
  await mkdir(dataPath, { recursive: true });
  if ((await readdir(dataPath)).length === 0) {
    await runProcess(
      mysqlExecutable,
      ['--initialize-insecure', `--basedir=${mysqlBase}`, `--datadir=${dataPath}`, '--console'],
      mysqlBase,
    );
  }

  const child = spawn(
    mysqlExecutable,
    [
      `--basedir=${mysqlBase}`,
      `--datadir=${dataPath}`,
      `--port=${DATABASE_PORT}`,
      '--bind-address=127.0.0.1',
      '--mysqlx=0',
      '--console',
    ],
    { cwd: mysqlBase, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  logChild(child, logPath);
  return child;
}

async function waitForApi(child: ChildProcess): Promise<void> {
  const url = `http://127.0.0.1:${API_PORT}/`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Backend exited with code ${child.exitCode}`);
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) });
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error('The local POS API did not become ready. Check backend.log in app data.');
}

export async function startLocalServices(): Promise<() => Promise<void>> {
  const resourceRoot = process.resourcesPath;
  const backendRoot = join(resourceRoot, 'backend');
  const backendRuntimeDeps = join(resourceRoot, 'node_modules');
  const mysqlBase = join(resourceRoot, 'mysql');
  const mysqlExecutable = join(mysqlBase, 'bin', 'mysqld.exe');
  const mysqlAdmin = join(mysqlBase, 'bin', 'mysqladmin.exe');
  const dataRoot = app.getPath('userData');
  const dataPath = join(dataRoot, 'database');
  const settingsPath = join(dataRoot, 'database-settings.json');
  const uploadsPath = join(dataRoot, 'uploads');
  const logRoot = join(dataRoot, 'logs');
  const mysqlLog = join(logRoot, 'mysql.log');
  const backendLog = join(logRoot, 'backend.log');

  await Promise.all([
    mkdir(dataRoot, { recursive: true }),
    mkdir(uploadsPath, { recursive: true }),
    mkdir(logRoot, { recursive: true }),
  ]);
  const settings = await readOrCreateSettings(settingsPath);
  process.env.NODE_PATH = [process.env.NODE_PATH, backendRuntimeDeps].filter(Boolean).join(';');
  const nodeModule = createRequire(join(backendRoot, 'package.json'))('node:module') as {
    _initPaths(): void;
  };
  nodeModule._initPaths();
  const runtimeRequire = createRequire(join(backendRoot, 'package.json'));
  const mysql = runtimeRequire('mysql2/promise') as MysqlModule;
  const mysqlBasePath = resolve(mysqlBase);
  const mysqlProcess = await startMySql(mysqlExecutable, mysqlBasePath, dataPath, mysqlLog);
  let backendProcess: ChildProcess | undefined;

  try {
    const rootConnection = await waitForDatabase(
      mysql,
      settings.rootPassword,
      settings.initialized,
    );
    try {
      await prepareDatabase(settingsPath, settings, rootConnection);
    } finally {
      await rootConnection.end();
    }

    backendProcess = spawn(process.execPath, [join(backendRoot, 'dist', 'main.js')], {
      cwd: backendRoot,
      windowsHide: true,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        DB_HOST: '127.0.0.1',
        DB_PORT: String(DATABASE_PORT),
        DB_USERNAME: DATABASE_USER,
        DB_PASSWORD: settings.appPassword,
        DB_DATABASE: DATABASE_NAME,
        JWT_SECRET: settings.jwtSecret,
        INITIAL_ADMIN_PASSWORD: settings.initialAdminPassword ?? '',
        INITIAL_STAFF_PASSWORD: settings.initialStaffPassword ?? '',
        UPLOADS_DIR: uploadsPath,
        MYSQL_PATH: join(mysqlBase, 'bin', 'mysql.exe'),
        MYSQLDUMP_PATH: join(mysqlBase, 'bin', 'mysqldump.exe'),
        NODE_PATH: backendRuntimeDeps,
        CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5173,http://localhost:5173',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    logChild(backendProcess, backendLog);
    await waitForApi(backendProcess);

    if (
      settings.initialCredentialsPending &&
      settings.initialAdminPassword &&
      settings.initialStaffPassword
    ) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Initial Dream Makeover POS accounts',
        message: 'Save these initial login credentials before continuing.',
        detail: `Admin (ADMIN)\nUsername: admin\nPassword: ${settings.initialAdminPassword}\n\nStaff (STAFF)\nUsername: staff\nPassword: ${settings.initialStaffPassword}`,
        buttons: ['Continue'],
        defaultId: 0,
        noLink: true,
      });
      settings.initialCredentialsPending = false;
      delete settings.initialAdminPassword;
      delete settings.initialStaffPassword;
      await writeSettings(settingsPath, settings);
    }
  } catch (error) {
    backendProcess?.kill();
    mysqlProcess.kill();
    throw error;
  }

  return async () => {
    if (backendProcess && backendProcess.exitCode === null) backendProcess.kill();
    if (mysqlProcess.exitCode === null) {
      await runProcess(
        mysqlAdmin,
        ['--host=127.0.0.1', `--port=${DATABASE_PORT}`, '--user=root', 'shutdown'],
        mysqlBase,
        { ...process.env, MYSQL_PWD: settings.rootPassword },
      ).catch(() => mysqlProcess.kill());
    }
  };
}
