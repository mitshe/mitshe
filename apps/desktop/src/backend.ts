import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const API_PORT = 13001;
const WEB_PORT = 13000;

let apiProcess: ChildProcess | null = null;
let webProcess: ChildProcess | null = null;

function getDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getResourcePath(...parts: string[]): string {
  // In dev: relative to project root. In prod: from app resources.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...parts);
  }
  return path.join(__dirname, '..', '..', ...parts);
}

function getEncryptionKey(): string {
  const keyFile = path.join(getDataDir(), '.encryption_key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf-8').trim();
  }
  const crypto = require('crypto');
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyFile, key, { mode: 0o600 });
  return key;
}

export function startAPI(): Promise<boolean> {
  return new Promise((resolve) => {
    const dataDir = getDataDir();
    const dbPath = path.join(dataDir, 'mitshe.db');
    const apiDir = getResourcePath('api');
    const entryPoint = path.join(apiDir, 'dist', 'main.js');

    if (!fs.existsSync(entryPoint)) {
      console.error(`API entry point not found: ${entryPoint}`);
      resolve(false);
      return;
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'production',
      PORT: String(API_PORT),
      DATABASE_URL: `file:${dbPath}`,
      ENCRYPTION_KEY: getEncryptionKey(),
      AUTH_MODE: 'selfhosted',
      NEXT_PUBLIC_AUTH_MODE: 'selfhosted',
      NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
      NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      // Skip Redis for desktop mode — queues disabled
      DESKTOP_MODE: 'true',
    };

    apiProcess = spawn('node', [entryPoint], {
      cwd: apiDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    apiProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[api]', msg.trim());
      if (msg.includes('application is running') || msg.includes('Nest application')) {
        resolve(true);
      }
    });

    apiProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[api]', data.toString().trim());
    });

    apiProcess.on('exit', (code) => {
      console.log(`[api] exited with code ${code}`);
      apiProcess = null;
      resolve(false);
    });

    // Timeout after 30s
    setTimeout(() => resolve(false), 30000);
  });
}

export function startWeb(): Promise<boolean> {
  return new Promise((resolve) => {
    const webDir = getResourcePath('web');
    const standaloneServer = path.join(webDir, '.next', 'standalone', 'apps', 'web', 'server.js');

    // Fallback: if standalone not available, try regular next start
    const entryPoint = fs.existsSync(standaloneServer)
      ? standaloneServer
      : null;

    if (!entryPoint) {
      console.error(`Web entry point not found: ${standaloneServer}`);
      resolve(false);
      return;
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'production',
      PORT: String(WEB_PORT),
      HOSTNAME: 'localhost',
      BACKEND_URL: `http://localhost:${API_PORT}`,
      AUTH_MODE: 'selfhosted',
      NEXT_PUBLIC_AUTH_MODE: 'selfhosted',
      NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
      NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
    };

    webProcess = spawn('node', [entryPoint], {
      cwd: path.dirname(entryPoint),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    webProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[web]', msg.trim());
      if (msg.includes('Ready') || msg.includes('started server') || msg.includes(`${WEB_PORT}`)) {
        resolve(true);
      }
    });

    webProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[web]', data.toString().trim());
    });

    webProcess.on('exit', (code) => {
      console.log(`[web] exited with code ${code}`);
      webProcess = null;
      resolve(false);
    });

    setTimeout(() => resolve(false), 30000);
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

export async function waitForHealth(): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${API_PORT}/health`);
      if (res.ok) return true;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export { API_PORT, WEB_PORT };
