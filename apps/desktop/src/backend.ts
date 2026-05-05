import { ChildProcess, spawn, execSync } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export const API_PORT = 13001;
export const WEB_PORT = 13000;

let apiProcess: ChildProcess | null = null;
let webProcess: ChildProcess | null = null;

function getDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBackendDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function getEncryptionKey(): string {
  const keyFile = path.join(getDataDir(), '.encryption_key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf-8').trim();
  }
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyFile, key, { mode: 0o600 });
  return key;
}

function initDatabase(): void {
  const backendDir = getBackendDir();
  const dbPath = path.join(getDataDir(), 'mitshe.db');

  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: `file:${dbPath}`,
      },
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (err) {
    console.error('[backend] prisma db push failed:', (err as Error).message);
  }
}

export interface StartResult {
  success: boolean;
  error?: string;
}

export async function startBackend(): Promise<StartResult> {
  const backendDir = getBackendDir();
  const entryPoint = path.join(backendDir, 'dist', 'main.js');

  if (!fs.existsSync(entryPoint)) {
    return { success: false, error: 'Backend not built. Run: cd apps/desktop && ./scripts/build-backend.sh' };
  }

  // Init/migrate database
  initDatabase();

  const dbPath = path.join(getDataDir(), 'mitshe.db');

  return new Promise((resolve) => {
    apiProcess = spawn('node', [entryPoint], {
      cwd: backendDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        DATABASE_URL: `file:${dbPath}`,
        ENCRYPTION_KEY: getEncryptionKey(),
        AUTH_MODE: 'selfhosted',
        NEXT_PUBLIC_AUTH_MODE: 'selfhosted',
        NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
        DESKTOP_MODE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    apiProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[api]', msg.trim());
      if (!started && (msg.includes('Nest application successfully started') || msg.includes('application is running'))) {
        started = true;
        resolve({ success: true });
      }
    });

    apiProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[api]', data.toString().trim());
    });

    apiProcess.on('exit', (code) => {
      console.log(`[api] exited with code ${code}`);
      apiProcess = null;
      if (!started) resolve({ success: false, error: `API exited with code ${code}` });
    });

    setTimeout(() => {
      if (!started) resolve({ success: false, error: 'API startup timeout (30s)' });
    }, 30000);
  });
}

export async function startWeb(): Promise<StartResult> {
  const webDir = app.isPackaged
    ? path.join(process.resourcesPath, 'web-standalone')
    : path.join(__dirname, '..', 'web-standalone');

  const serverJs = path.join(webDir, 'apps', 'web', 'server.js');

  if (!fs.existsSync(serverJs)) {
    return { success: false, error: 'Web not built. Run: cd apps/desktop && ./scripts/build-backend.sh' };
  }

  return new Promise((resolve) => {
    webProcess = spawn('node', [serverJs], {
      cwd: path.join(webDir, 'apps', 'web'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(WEB_PORT),
        HOSTNAME: 'localhost',
        BACKEND_URL: `http://localhost:${API_PORT}`,
        AUTH_MODE: 'selfhosted',
        NEXT_PUBLIC_AUTH_MODE: 'selfhosted',
        NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    webProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[web]', msg.trim());
      if (!started && (msg.includes('Ready') || msg.includes(`localhost:${WEB_PORT}`) || msg.includes('started server'))) {
        started = true;
        resolve({ success: true });
      }
    });

    webProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[web]', data.toString().trim());
    });

    webProcess.on('exit', (code) => {
      console.log(`[web] exited with code ${code}`);
      webProcess = null;
      if (!started) resolve({ success: false, error: `Web exited with code ${code}` });
    });

    setTimeout(() => {
      if (!started) resolve({ success: false, error: 'Web startup timeout (30s)' });
    }, 30000);
  });
}

export function stopBackend(): void {
  if (apiProcess) {
    apiProcess.kill('SIGTERM');
    apiProcess = null;
  }
  if (webProcess) {
    webProcess.kill('SIGTERM');
    webProcess = null;
  }
}

export function checkDocker(): { installed: boolean; running: boolean } {
  try {
    const v = execSync('docker --version', { encoding: 'utf-8', timeout: 5000 });
    const installed = v.includes('Docker');
    const running = installed && execSync('docker info', { encoding: 'utf-8', timeout: 5000 }).includes('Server');
    return { installed, running };
  } catch {
    return { installed: false, running: false };
  }
}
