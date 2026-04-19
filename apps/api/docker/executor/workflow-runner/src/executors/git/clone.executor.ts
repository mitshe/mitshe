/**
 * Git Clone Executor
 * Handles: data:get_repository, data:find_repository, action:git_clone
 */

import { simpleGit } from 'simple-git';
import { BaseExecutor, type ExecutorContext } from '../base.js';
import { buildAuthUrl, configureGitUser, runGitCmd } from './helpers.js';
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

    const authUrl = buildAuthUrl(cloneUrl, ctx);

    const args = ['clone'];
    if (shallow) args.push('--depth', '1');
    if (defaultBranch) args.push('--branch', defaultBranch);
    args.push(authUrl, targetDir);

    const result = await runGitCmd(args, '/workspace');

    if (result.exitCode !== 0) {
      const msg = result.stderr || result.stdout;
      if (msg.includes('already exists')) {
        logger.info('Repository directory already exists, using existing clone');
      } else if (msg.includes('Authentication failed') || msg.includes('could not read Username')) {
        throw new Error('Git authentication failed. Check your git integration token.');
      } else {
        throw new Error(`Failed to clone repository: ${msg}`);
      }
    }

    ctx.workflowContext.repoDir = targetDir;
    ctx.workflowContext.branch = defaultBranch;

    const repoGit = simpleGit(targetDir);
    await configureGitUser(repoGit);

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
