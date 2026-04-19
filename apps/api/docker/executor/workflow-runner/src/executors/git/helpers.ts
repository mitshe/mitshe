/**
 * Git Helper Functions
 * Shared utilities for git operations
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { spawn } from 'child_process';
import type { ExecutorContext } from '../base.js';
import { logger } from '../../logger.js';

/**
 * Build authenticated URL for git operations
 */
export function buildAuthUrl(repoUrl: string, ctx: ExecutorContext): string {
  if (!ctx.credentials.gitToken) {
    return repoUrl;
  }

  try {
    const url = new URL(repoUrl);

    if (ctx.credentials.gitProvider === 'gitlab') {
      url.username = 'oauth2';
      url.password = ctx.credentials.gitToken;
    } else {
      // GitHub uses token as username
      url.username = ctx.credentials.gitToken;
      url.password = '';
    }

    return url.toString();
  } catch {
    logger.warn(`Failed to parse git URL: ${repoUrl}`);
    return repoUrl;
  }
}

/**
 * Get repository directory from context
 */
export function getRepoDir(ctx: ExecutorContext): string {
  return (ctx.workflowContext.repoDir as string) || ctx.workingDir;
}

/**
 * Get current branch from context
 */
export function getCurrentBranch(ctx: ExecutorContext): string | undefined {
  return ctx.workflowContext.branch as string | undefined;
}

/**
 * Get SimpleGit instance for repository
 */
export function getGit(ctx: ExecutorContext): SimpleGit {
  return simpleGit(getRepoDir(ctx));
}

/**
 * Configure git user for commits
 */
export async function configureGitUser(git: SimpleGit): Promise<void> {
  try {
    await git.addConfig('user.email', 'workflow@mitshe.com');
    await git.addConfig('user.name', 'Mitshe Workflow');
  } catch {
    // Config might already exist, ignore
  }
}

/**
 * Run a git command directly via spawn, capturing real stdout/stderr.
 * Emits a 'cmd' event with the command and its actual output.
 */
export async function runGitCmd(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cmdStr = `git ${args.join(' ')}`;

  return new Promise((resolve) => {
    const proc = spawn('git', args, { cwd });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      // Emit command + real output
      const output = (stdout + stderr).trim();
      logger.cmd(cmdStr, output || undefined);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

/**
 * Check if branch exists on remote
 */
export async function branchExistsOnRemote(
  git: SimpleGit,
  branch: string,
): Promise<boolean> {
  try {
    const remotes = await git.listRemote(['--heads', 'origin', branch]);
    return remotes.includes(branch);
  } catch {
    return false;
  }
}
