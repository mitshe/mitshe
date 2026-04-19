/**
 * Git Commit Executor
 * Handles: action:git_commit
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getRepoDir, runGitCmd } from './helpers.js';

interface FileToCommit {
  path: string;
  content: string;
}

export class GitCommitExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_commit'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const message = this.getString(config, 'message');
    const repoDir = getRepoDir(ctx);

    // Get files from config or workflow context (from AI code task)
    let files = config.files as FileToCommit[] | undefined;
    if (!files || files.length === 0) {
      files = ctx.workflowContext.files as FileToCommit[] | undefined;
    }

    if (!files || files.length === 0) {
      throw new Error(
        'No files to commit. Either provide files in config or ' +
        'use AI Code Task to generate files first.',
      );
    }

    // Write files to disk
    for (const file of files) {
      const filePath = join(repoDir, file.path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, 'utf8');
    }

    // Configure git user
    await runGitCmd(['config', 'user.email', 'workflow@mitshe.com'], repoDir);
    await runGitCmd(['config', 'user.name', 'Mitshe Workflow'], repoDir);

    // Stage files
    await runGitCmd(['add', ...files.map((f) => f.path)], repoDir);

    // Commit
    const result = await runGitCmd(['commit', '-m', message], repoDir);

    if (result.exitCode !== 0) {
      throw new Error(
        `Commit failed: ${result.stderr || result.stdout || 'no changes detected'}`,
      );
    }

    // Extract commit hash from output
    const hashMatch = result.stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = hashMatch ? hashMatch[1] : '';

    return {
      committed: true,
      commitHash,
      filesCommitted: files.length,
      message,
    };
  }
}
