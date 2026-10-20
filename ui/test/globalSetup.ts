/**
 * Starts the real backend once for the whole frontend test run (CLAUDE.md, "Frontend testing"). No mocked API: every
 * test talks to this service.
 *
 *  1. Copies the built service jar (service/target/service-*.jar) to ui/target/test-backend/. The copy is what runs,
 *     so a backend build at the same time can still replace service/target (a running jar is locked on Windows).
 *  2. Starts it with `java -jar` on a free port, with its own in-memory H2, output in ui/target/test-backend.log.
 *  3. Waits until /api-docs answers, then hands the tests `apiBaseUrl` (see test/setup.ts).
 *
 * If the backend doesn't come up, the run fails. The teardown stops it again.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GlobalSetupContext } from 'vitest/node';

declare module 'vitest' {
  interface ProvidedContext {
    /** `http://localhost:<port>` of the test backend. */
    apiBaseUrl: string;
    /** Absolute path of the backend's output (plain Spring log lines and one JSON evidence line per request). */
    backendLogPath: string;
  }
}

const UI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVICE_TARGET_DIR = path.resolve(UI_DIR, '../service/target');
const COPY_DIR = path.join(UI_DIR, 'target/test-backend');
const LOG_PATH = path.join(UI_DIR, 'target/test-backend.log');

const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;
const STOP_TIMEOUT_MS = 10_000;

export default async function setup({ provide }: GlobalSetupContext) {
  const jar = copyServiceJar();
  const port = await freePort();
  const backend = startBackend(jar, port);
  // A run killed with Ctrl+C may skip the teardown; don't leave the backend behind then either
  const killOnExit = () => killNow(backend);
  process.on('exit', killOnExit);

  const baseUrl = `http://localhost:${port}`;
  try {
    await waitUntilUp(backend, baseUrl);
  } catch (error) {
    await stopBackend(backend);
    throw error;
  }

  provide('apiBaseUrl', baseUrl);
  provide('backendLogPath', LOG_PATH);

  return async () => {
    await stopBackend(backend);
    process.off('exit', killOnExit);
  };
}

// ---- Jar ---------------------------------------------------------------------------------------------------------

/** Copies the service jar under a name of its own, so a copy still locked by an earlier run is never overwritten. */
function copyServiceJar(): string {
  const source = findServiceJar();
  fs.mkdirSync(COPY_DIR, { recursive: true });
  removeOldCopies();
  const copy = path.join(COPY_DIR, `service-${Date.now()}-${process.pid}.jar`);
  fs.copyFileSync(source, copy);
  return copy;
}

function findServiceJar(): string {
  const names = fs.existsSync(SERVICE_TARGET_DIR) ? fs.readdirSync(SERVICE_TARGET_DIR) : [];
  for (const name of names) {
    if (/^service-.*\.jar$/.test(name)) {
      return path.join(SERVICE_TARGET_DIR, name);
    }
  }
  throw new Error(
    `No service jar in ${SERVICE_TARGET_DIR}. The frontend tests run against the real backend: build it first ` +
      '(mvn install -DskipTests from the repository root).',
  );
}

/** Removes copies left by earlier runs. The copy of a run that is still going (its test process is alive) stays. */
function removeOldCopies(): void {
  for (const name of fs.readdirSync(COPY_DIR)) {
    const owner = /^service-\d+-(\d+)\.jar$/.exec(name);
    if (owner && isAlive(Number(owner[1]))) {
      continue;
    }
    try {
      fs.rmSync(path.join(COPY_DIR, name), { force: true });
    } catch {
      // still locked by a backend that outlived its run; a later run removes it
    }
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ---- Process -----------------------------------------------------------------------------------------------------

/** A port the OS says is free right now. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => (port ? resolve(port) : reject(new Error('Could not pick a free port.'))));
    });
  });
}

function startBackend(jar: string, port: number): ChildProcess {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  const log = fs.openSync(LOG_PATH, 'w');
  const backend = spawn(javaExecutable(), ['-jar', jar, `--server.port=${port}`], {
    cwd: COPY_DIR,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  fs.closeSync(log);
  return backend;
}

/** The JDK from JAVA_HOME when it is set, else `java` from the PATH. */
function javaExecutable(): string {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const java = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(java)) {
      return java;
    }
  }
  return 'java';
}

async function waitUntilUp(backend: ChildProcess, baseUrl: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (hasExited(backend)) {
      throw startupFailure(`The test backend exited with code ${backend.exitCode} before it answered.`);
    }
    if (await answers(`${baseUrl}/api-docs`)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw startupFailure(`The test backend did not answer ${baseUrl}/api-docs within ${STARTUP_TIMEOUT_MS / 1000} s.`);
}

async function answers(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function hasExited(backend: ChildProcess): boolean {
  return backend.exitCode !== null || backend.signalCode !== null;
}

function startupFailure(reason: string): Error {
  const lines = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/) : [];
  const tail = lines.slice(-40).join('\n');
  return new Error(`${reason}\nFull output: ${LOG_PATH}\n---- last lines ----\n${tail}`);
}

/** Stops the backend and waits until the process is really gone. */
async function stopBackend(backend: ChildProcess): Promise<void> {
  if (hasExited(backend)) {
    return;
  }
  const exited = new Promise<void>((resolve) => backend.once('exit', () => resolve()));
  killNow(backend);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS).unref());
  await Promise.race([exited, timeout]);
  if (!hasExited(backend)) {
    backend.kill('SIGKILL');
    await Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS).unref())]);
  }
}

/**
 * Synchronous, so it also works in a `process.on('exit')` handler. On Windows `taskkill /T /F` ends the process and
 * anything it started; a plain kill() may leave a java launcher's child running.
 */
function killNow(backend: ChildProcess): void {
  if (hasExited(backend) || backend.pid === undefined) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(backend.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    backend.kill('SIGTERM');
  }
}
