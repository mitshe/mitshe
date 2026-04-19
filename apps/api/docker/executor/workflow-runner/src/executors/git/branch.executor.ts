/**
 * Git Branch Executor
 * Handles: action:git_create_branch
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getGit, getCurrentBranch } from './helpers.js';
import { logger } from '../../logger.js';

export class GitBranchExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_create_branch'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const branchName = this.getString(config, 'branchName');
    const sourceBranch = this.getOptionalString(config, 'sourceBranch');

    const git = getGit(ctx);

    logger.cmd(`git checkout -b ${branchName}${sourceBranch ? ` ${sourceBranch}` : ''}`);

    // If source branch specified, checkout it first
    if (sourceBranch) {
      try {
        await git.checkout(sourceBranch);
      } catch (error) {
        throw new Error(
          `Failed to checkout source branch "${sourceBranch}": ` +
          `${(error as Error).message}`,
        );
      }
    }

    // Create and checkout new branch
    try {
      await git.checkoutLocalBranch(branchName);
      logger.cmd(`git checkout -b ${branchName}`, `Switched to a new branch '${branchName}'`);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('already exists')) {
        // Branch exists, just checkout
        await git.checkout(branchName);
        logger.warn(`Branch "${branchName}" already exists, checked out existing branch`);
      } else {
        throw new Error(`Failed to create branch "${branchName}": ${message}`);
      }
    }

    // Update workflow context
    ctx.workflowContext.branch = branchName;

    return {
      created: true,
      branchName,
      sourceBranch: sourceBranch || getCurrentBranch(ctx) || 'HEAD',
    };
  }
}
