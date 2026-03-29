/**
 * Git Commit Executor
 * Handles: action:git_commit
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getGit, getRepoDir, configureGitUser } from './helpers.js';
import { logger } from '../../logger.js';

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

    logger.info(`Committing ${files.length} file(s): ${files.map(f => f.path).join(', ')}`);

    // Write files to disk
    for (const file of files) {
      const filePath = join(repoDir, file.path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, 'utf8');
      logger.info(`Written: ${file.path}`);
    }

    const git = getGit(ctx);

    // Ensure git user is configured
    await configureGitUser(git);

    // Stage files
    await git.add(files.map(f => f.path));

    // Commit
    const result = await git.commit(message);

    if (!result.commit) {
      throw new Error('Commit failed - no changes detected or commit was empty');
    }

    logger.info(`Committed: ${result.commit}`);

    return {
      committed: true,
      commitHash: result.commit,
      filesCommitted: files.length,
      message,
    };
  }
}
