/**
 * Git Push Executor
 * Handles: action:git_push
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getGit, getCurrentBranch } from './helpers.js';
import { logger } from '../../logger.js';

export class GitPushExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_push'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const branch = this.getOptionalString(config, 'branch') || getCurrentBranch(ctx);
    const force = this.getBoolean(config, 'force', false);
    const setUpstream = this.getBoolean(config, 'setUpstream', true);

    if (!branch) {
      throw new Error('Branch name is required. Create a branch first.');
    }

    logger.info(`Pushing branch: ${branch}`);

    const git = getGit(ctx);

    try {
      const pushArgs: string[] = [];

      if (setUpstream) {
        pushArgs.push('--set-upstream');
      }
      if (force) {
        pushArgs.push('--force');
      }

      pushArgs.push('origin', branch);

      await git.push(pushArgs);

      logger.info(`Successfully pushed branch: ${branch}`);
    } catch (error) {
      const message = (error as Error).message;

      if (
        message.includes('Authentication failed') ||
        message.includes('could not read Username')
      ) {
        throw new Error(
          `Git push authentication failed. Check your git integration token. ` +
          `Original error: ${message}`,
        );
      }

      throw new Error(`Failed to push branch "${branch}": ${message}`);
    }

    return {
      pushed: true,
      branch,
    };
  }
}
