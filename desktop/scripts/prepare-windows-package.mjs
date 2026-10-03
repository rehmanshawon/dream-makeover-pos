import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(desktopRoot, '..');
const stagingRoot = join(desktopRoot, 'installer-resources');
const backendRoot = join(stagingRoot, 'backend');
const backendRuntimeDeps = join(stagingRoot, 'runtime-deps');
const mysqlRoot = join(stagingRoot, 'mysql');
const mysqlVersion = '8.4.10';
const mysqlArchiveName = `mysql-${mysqlVersion}-winx64.zip`;
const mysqlUrl = `https://downloads.mysql.com/archives/get/p/23/file/${mysqlArchiveName}`;
const mysqlMd5 = '150f12262df6ac88d43862a0e683eb81';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

async function downloadMysql(archivePath) {
  const response = await globalThis.fetch(mysqlUrl, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`MySQL download failed with HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archivePath, { flags: 'wx' }));
  const digest = createHash('md5');
  for await (const chunk of createReadStream(archivePath)) digest.update(chunk);
  if (digest.digest('hex') !== mysqlMd5) {
    throw new Error('Downloaded MySQL archive does not match the official MD5 checksum.');
  }
}

async function hasExpectedMysql(mysqlDirectory) {
  const executable = join(mysqlDirectory, 'bin', 'mysqld.exe');
  if (!(await stat(executable).catch(() => null))) return false;
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 && `${result.stdout}${result.stderr}`.includes(`Ver ${mysqlVersion}`);
}

async function hasExpectedArchive(archivePath) {
  if (!(await stat(archivePath).catch(() => null))) return false;
  const digest = createHash('md5');
  for await (const chunk of createReadStream(archivePath)) digest.update(chunk);
  return digest.digest('hex') === mysqlMd5;
}

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('The Windows installer must be staged on Windows x64.');
}

await rm(stagingRoot, { recursive: true, force: true });
await mkdir(backendRoot, { recursive: true });

const backendPackage = JSON.parse(
  await readFile(join(repositoryRoot, 'backend', 'package.json'), 'utf8'),
);
await writeFile(
  join(backendRoot, 'package.json'),
  JSON.stringify(
    {
      name: backendPackage.name,
      version: backendPackage.version,
      private: true,
      dependencies: backendPackage.dependencies,
    },
    null,
    2,
  ),
);
await cp(join(repositoryRoot, 'backend', 'dist'), join(backendRoot, 'dist'), { recursive: true });

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through the npm workspace command.');
run(process.execPath, [npmCli, 'install', '--omit=dev', '--no-audit', '--no-fund'], {
  cwd: backendRoot,
});
await cp(join(backendRoot, 'node_modules'), backendRuntimeDeps, { recursive: true });

const previousMysqlRoot = join(desktopRoot, 'release', 'win-unpacked', 'resources', 'mysql');
if (await hasExpectedMysql(previousMysqlRoot)) {
  await cp(previousMysqlRoot, mysqlRoot, { recursive: true });
} else {
  const cacheRoot = join(
    process.env.LOCALAPPDATA ?? desktopRoot,
    'DreamMakeoverPOS',
    'build-cache',
  );
  const archivePath = join(cacheRoot, mysqlArchiveName);
  const extractionRoot = join(stagingRoot, 'mysql-extracted');
  await mkdir(cacheRoot, { recursive: true });
  if (!(await hasExpectedArchive(archivePath))) {
    await rm(archivePath, { force: true });
    await downloadMysql(archivePath);
  }
  await mkdir(extractionRoot, { recursive: true });
  const quotePowerShell = (value) => `'${value.replace(/'/g, "''")}'`;
  run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `Expand-Archive -LiteralPath ${quotePowerShell(archivePath)} -DestinationPath ${quotePowerShell(extractionRoot)} -Force`,
  ]);

  const extractedEntries = await readdir(extractionRoot, { withFileTypes: true });
  const extractedMysql = extractedEntries.find(
    (entry) => entry.isDirectory() && entry.name === `mysql-${mysqlVersion}-winx64`,
  );
  if (!extractedMysql) throw new Error('The extracted MySQL directory was not found.');
  await cp(join(extractionRoot, extractedMysql.name), mysqlRoot, { recursive: true });
  await rm(extractionRoot, { recursive: true, force: true });
}

const licensePath = join(mysqlRoot, 'LICENSE');
if (!(await stat(licensePath).catch(() => null))) {
  throw new Error('The MySQL distribution license file is missing.');
}

globalThis.console.log(`Prepared backend production dependencies and MySQL ${mysqlVersion}.`);
