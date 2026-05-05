import { execSync, spawn } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const CONTAINER_NAME = 'mitshe-desktop';
const IMAGE = process.env.MITSHE_IMAGE || 'ghcr.io/mitshe/mitshe:latest';
export const API_PORT = 13001;
export const WEB_PORT = 13000;

function getDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch {
    return '';
  }
}

export interface StartResult {
  success: boolean;
  error?: string;
}

export function checkDocker(): { installed: boolean; running: boolean } {
  const installed = exec('docker --version').includes('Docker');
  const running = installed && exec('docker info').includes('Server');
  return { installed, running };
}

export async function startBackend(): Promise<StartResult> {
  const docker = checkDocker();
  if (!docker.installed) return { success: false, error: 'docker-not-installed' };
  if (!docker.running) return { success: false, error: 'docker-not-running' };

  // Check if container already running
  const status = exec(`docker ps --filter name=^${CONTAINER_NAME}$ --format "{{.Status}}"`);
  if (status.toLowerCase().startsWith('up')) {
    const healthy = await waitForReady();
    return healthy ? { success: true } : { success: false, error: 'unhealthy' };
  }

  // Check if container exists but stopped
  const exists = exec(`docker ps -a --filter name=^${CONTAINER_NAME}$ --format "{{.ID}}"`);
  if (exists) {
    exec(`docker rm -f ${CONTAINER_NAME}`);
  }

  // Check if image exists
  const hasImage = exec(`docker images -q ${IMAGE}`).length > 0;
  if (!hasImage) {
    try {
      await pullImage();
    } catch {
      return { success: false, error: 'pull-failed' };
    }
  }

  // Start container
  const dataDir = getDataDir();
  const dockerSocket = process.platform === 'win32'
    ? '//var/run/docker.sock'
    : '/var/run/docker.sock';

  const result = exec([
    'docker run -d',
    `--name ${CONTAINER_NAME}`,
    `-p ${WEB_PORT}:3000`,
    `-p ${API_PORT}:3001`,
    `-v "${dataDir}":/build/data`,
    `-v ${dockerSocket}:/var/run/docker.sock`,
    `--restart unless-stopped`,
    IMAGE,
  ].join(' '));

  if (!result) {
    return { success: false, error: 'container-start-failed' };
  }

  const healthy = await waitForReady();
  return healthy ? { success: true } : { success: false, error: 'unhealthy' };
}

function pullImage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['pull', IMAGE]);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
    proc.on('error', reject);
  });
}

async function waitForReady(retries = 60): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${API_PORT}/health`);
      if (res.ok) return true;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

export function stopBackend(): void {
  exec(`docker stop ${CONTAINER_NAME}`);
}
