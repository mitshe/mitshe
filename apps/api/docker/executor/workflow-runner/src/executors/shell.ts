/**
 * Shell Node Executors
 * Handles shell commands and Docker operations
 */

import { spawn } from 'child_process';
import type { ExecutorContext } from './index.js';
import { logger } from '../logger.js';

export async function executeShellNode(
  type: string,
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'action:shell_exec':
      return executeShellCommand(config, ctx);

    case 'action:docker_build':
      return executeDockerBuild(config, ctx);

    case 'action:docker_run':
      return executeDockerRun(config, ctx);

    default:
      throw new Error(`Unknown shell action: ${type}`);
  }
}

/**
 * Execute a shell command
 */
async function executeShellCommand(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const command = config.command as string;
  const args = (config.args as string[]) || [];
  const cwd = (config.cwd as string) || ctx.workingDir;
  const timeout = (config.timeout as number) || 300000; // 5 min default

  if (!command) {
    throw new Error('Command is required');
  }

  logger.info(`Executing: ${command} ${args.join(' ')}`);

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        ...((config.env as Record<string, string>) || {}),
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr,
        error: 'Command timed out',
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        error: err.message,
      });
    });
  });
}

/**
 * Execute npm/pnpm/yarn commands
 */
export async function executePackageManager(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const pm = (config.packageManager as string) || 'npm';
  const action = config.action as string; // install, build, test, etc.
  const args = (config.args as string[]) || [];

  const command = pm;
  const fullArgs = [action, ...args];

  logger.info(`Running: ${pm} ${fullArgs.join(' ')}`);

  return executeShellCommand(
    {
      command,
      args: fullArgs,
      cwd: config.cwd || ctx.workflowContext.repoDir || ctx.workingDir,
    },
    ctx,
  );
}

/**
 * Docker build (if needed inside container - rare case)
 */
async function executeDockerBuild(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const dockerfile = (config.dockerfile as string) || 'Dockerfile';
  const tag = config.tag as string;
  const context = (config.context as string) || '.';
  const buildArgs = (config.buildArgs as Record<string, string>) || {};

  if (!tag) {
    throw new Error('Docker image tag is required');
  }

  const args = ['build', '-f', dockerfile, '-t', tag];

  for (const [key, value] of Object.entries(buildArgs)) {
    args.push('--build-arg', `${key}=${value}`);
  }

  args.push(context);

  logger.info(`Building Docker image: ${tag}`);

  return executeShellCommand(
    {
      command: 'docker',
      args,
      cwd: ctx.workflowContext.repoDir || ctx.workingDir,
    },
    ctx,
  );
}

/**
 * Docker run
 */
async function executeDockerRun(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const image = config.image as string;
  const command = config.command as string[];
  const env = (config.env as Record<string, string>) || {};
  const volumes = (config.volumes as string[]) || [];
  const workdir = config.workdir as string;

  if (!image) {
    throw new Error('Docker image is required');
  }

  const args = ['run', '--rm'];

  for (const [key, value] of Object.entries(env)) {
    args.push('-e', `${key}=${value}`);
  }

  for (const volume of volumes) {
    args.push('-v', volume);
  }

  if (workdir) {
    args.push('-w', workdir);
  }

  args.push(image);

  if (command && command.length > 0) {
    args.push(...command);
  }

  logger.info(`Running Docker container: ${image}`);

  return executeShellCommand(
    {
      command: 'docker',
      args,
    },
    ctx,
  );
}
