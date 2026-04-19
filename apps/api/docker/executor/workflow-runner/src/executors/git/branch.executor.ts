/**
 * Git Branch Executor
 * Handles: action:git_create_branch
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getCurrentBranch, getRepoDir, runGitCmd } from './helpers.js';

export class GitBranchExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_create_branch'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const branchName = this.getString(config, 'branchName');
    const sourceBranch = this.getOptionalString(config, 'sourceBranch');
    const repoDir = getRepoDir(ctx);

    if (sourceBranch) {
      await runGitCmd(['checkout', sourceBranch], repoDir);
    }

    const result = await runGitCmd(['checkout', '-b', branchName], repoDir);

    if (result.exitCode !== 0) {
      if (result.stderr.includes('already exists')) {
        await runGitCmd(['checkout', branchName], repoDir);
      } else {
        throw new Error(`Failed to create branch "${branchName}": ${result.stderr}`);
      }
    }

    ctx.workflowContext.branch = branchName;

    return {
      created: true,
      branchName,
      sourceBranch: sourceBranch || getCurrentBranch(ctx) || 'HEAD',
    };
  }
}
