/**
 * Git Clone Executor
 * Handles: data:get_repository, data:find_repository, action:git_clone
 */

import { simpleGit } from 'simple-git';
import { BaseExecutor, type ExecutorContext } from '../base.js';
import { buildAuthUrl, configureGitUser } from './helpers.js';
import { logger } from '../../logger.js';

export class GitCloneExecutor extends BaseExecutor {
  readonly supportedTypes = [
    'data:get_repository',
    'data:find_repository',
    'action:git_clone',
  ];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const repoName = this.getOptionalString(config, 'repositoryName');
    const repoFullPath = this.getOptionalString(config, 'repositoryFullPath');
    const cloneUrl = this.getString(
      config,
      'cloneUrl',
      ctx.workflowContext.cloneUrl as string,
    );
    const defaultBranch = this.getString(config, 'defaultBranch', 'main');
    const shallow = this.getBoolean(config, 'shallow', true);
    const targetDir = this.getOptionalString(config, 'targetDir') || ctx.workingDir;

    if (!cloneUrl) {
      throw new Error(
        'Repository clone URL is required. ' +
        'Ensure the repository is properly configured in your organization settings.',
      );
    }

    // Update workflow context
    ctx.workflowContext.repositoryName = repoName;
    ctx.workflowContext.repositoryFullPath = repoFullPath;
    ctx.workflowContext.cloneUrl = cloneUrl;
    ctx.workflowContext.defaultBranch = defaultBranch;

    const cloneArgs = shallow ? `--depth 1 --branch ${defaultBranch}` : '';
    logger.cmd(`git clone ${cloneArgs} ${repoFullPath || cloneUrl} ${targetDir}`.trim());

    const authUrl = buildAuthUrl(cloneUrl, ctx);
    const git = simpleGit();

    // Build clone options
    const options: string[] = [];
    if (shallow) {
      options.push('--depth', '1');
    }
    if (defaultBranch) {
      options.push('--branch', defaultBranch);
    }

    try {
      await git.clone(authUrl, targetDir, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('already exists')) {
        logger.warn('Repository directory already exists, using existing clone');
      } else if (
        message.includes('Authentication failed') ||
        message.includes('could not read Username')
      ) {
        throw new Error(
          `Git authentication failed. Check your git integration token. ` +
          `Original error: ${message}`,
        );
      } else {
        throw new Error(`Failed to clone repository: ${message}`);
      }
    }

    // Update context
    ctx.workflowContext.repoDir = targetDir;
    ctx.workflowContext.branch = defaultBranch;

    // Configure git user for future commits
    const repoGit = simpleGit(targetDir);
    await configureGitUser(repoGit);

    logger.cmd(`git clone`, `Cloning into '${targetDir}'...\ndone.`);

    return {
      repositoryName: repoName,
      fullPath: repoFullPath,
      cloneUrl,
      defaultBranch,
      cloned: true,
      directory: targetDir,
    };
  }
}
