import { execSync, spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const CONTAINER_NAME = 'mitshe-desktop';
const IMAGE = 'ghcr.io/mitshe/mitshe:latest';
const API_PORT = 3001;
const WEB_PORT = 3000;

export interface DockerStatus {
  dockerInstalled: boolean;
  dockerRunning: boolean;
  containerRunning: boolean;
  containerExists: boolean;
}

function getDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch {
    return '';
  }
}

export function checkDocker(): DockerStatus {
  const dockerInstalled = exec('docker --version').includes('Docker');
  const dockerRunning = dockerInstalled && exec('docker info').includes('Server');

  let containerRunning = false;
  let containerExists = false;

  if (dockerRunning) {
    const ps = exec(`docker ps -a --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
    containerExists = ps.length > 0;
    containerRunning = ps.toLowerCase().startsWith('up');
  }

  return { dockerInstalled, dockerRunning, containerRunning, containerExists };
}

export async function ensureContainer(): Promise<boolean> {
  const status = checkDocker();

  if (!status.dockerInstalled || !status.dockerRunning) {
    return false;
  }

  if (status.containerRunning) {
    return true;
  }

  const dataDir = getDataDir();

  if (status.containerExists) {
    exec(`docker start ${CONTAINER_NAME}`);
    return waitForReady();
  }

  // Pull image if not present
  const hasImage = exec(`docker image inspect ${IMAGE}`).length > 0;
  if (!hasImage) {
    execSync(`docker pull ${IMAGE}`, { stdio: 'inherit', timeout: 300000 });
  }

  // Run container
  const dockerSocket = process.platform === 'win32'
    ? '//var/run/docker.sock'
    : '/var/run/docker.sock';

  exec([
    'docker run -d',
    `--name ${CONTAINER_NAME}`,
    `-p ${WEB_PORT}:3000`,
    `-p ${API_PORT}:3001`,
    `-v "${dataDir}":/build/data`,
    `-v ${dockerSocket}:/var/run/docker.sock`,
    IMAGE,
  ].join(' '));

  return waitForReady();
}

async function waitForReady(retries = 30): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${API_PORT}/api/v1/health`);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

export function stopContainer(): void {
  exec(`docker stop ${CONTAINER_NAME}`);
}

export function removeContainer(): void {
  exec(`docker stop ${CONTAINER_NAME}`);
  exec(`docker rm ${CONTAINER_NAME}`);
}

export function getContainerLogs(lines = 100): string {
  return exec(`docker logs --tail ${lines} ${CONTAINER_NAME}`);
}
