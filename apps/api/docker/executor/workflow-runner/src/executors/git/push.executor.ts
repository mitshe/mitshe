/**
 * Git Push Executor
 * Handles: action:git_push
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getCurrentBranch, getRepoDir, runGitCmd } from './helpers.js';

export class GitPushExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_push'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const branch = this.getOptionalString(config, 'branch') || getCurrentBranch(ctx);
    const force = this.getBoolean(config, 'force', false);
    const setUpstream = this.getBoolean(config, 'setUpstream', true);
    const repoDir = getRepoDir(ctx);

    if (!branch) {
      throw new Error('Branch name is required. Create a branch first.');
    }

    const args = ['push'];
    if (setUpstream) args.push('--set-upstream');
    if (force) args.push('--force');
    args.push('origin', branch);

    const result = await runGitCmd(args, repoDir);

    if (result.exitCode !== 0) {
      const msg = result.stderr || result.stdout;
      if (msg.includes('Authentication failed') || msg.includes('could not read Username')) {
        throw new Error('Git push authentication failed. Check your git integration token.');
      }
      throw new Error(`Failed to push branch "${branch}": ${msg}`);
    }

    return {
      pushed: true,
      branch,
    };
  }
}
