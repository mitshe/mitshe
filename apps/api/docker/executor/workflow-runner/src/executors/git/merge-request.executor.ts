/**
 * Git Merge Request / Pull Request Executor
 * Handles: action:git_create_mr, action:git_create_pr
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { getGit, getCurrentBranch, branchExistsOnRemote } from './helpers.js';
import { GitPushExecutor } from './push.executor.js';
import { logger } from '../../logger.js';

interface MROptions {
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  token: string;
}

export class GitMergeRequestExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:git_create_mr', 'action:git_create_pr'];

  private pushExecutor = new GitPushExecutor();

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const title = this.getString(config, 'title');
    const description = this.getOptionalString(config, 'description');
    const sourceBranch =
      this.getOptionalString(config, 'sourceBranch') || getCurrentBranch(ctx);
    const targetBranch =
      this.getOptionalString(config, 'targetBranch') ||
      (ctx.workflowContext.defaultBranch as string) ||
      'main';
    const repoFullPath = ctx.workflowContext.repositoryFullPath as string;
    const autoPush = this.getBoolean(config, 'autoPush', true);

    // Validation
    if (!sourceBranch) {
      throw new Error('Source branch is required. Create a branch first.');
    }
    if (!repoFullPath) {
      throw new Error(
        'Repository full path is required. ' +
        'Use "Get Repository" node first to setup the repository context.',
      );
    }
    if (!ctx.credentials.gitToken) {
      throw new Error('Git token is required to create MR/PR');
    }

    const git = getGit(ctx);

    // Check if branch exists on remote
    const branchExists = await branchExistsOnRemote(git, sourceBranch);

    if (!branchExists) {
      if (autoPush) {
        logger.info(`Branch "${sourceBranch}" not found on remote, pushing...`);
        await this.pushExecutor.execute(
          { branch: sourceBranch, setUpstream: true },
          ctx,
        );
      } else {
        throw new Error(
          `Branch "${sourceBranch}" does not exist on remote. ` +
          `Use "Git Push" node first, or set autoPush: true.`,
        );
      }
    }

    logger.info(`Creating MR/PR: "${title}" (${sourceBranch} → ${targetBranch})`);

    // Create MR/PR based on provider
    const options: MROptions = {
      title,
      description,
      sourceBranch,
      targetBranch,
      token: ctx.credentials.gitToken,
    };

    let result: Record<string, unknown>;
    if (ctx.credentials.gitProvider === 'gitlab') {
      result = await this.createGitLabMR(repoFullPath, options);
    } else {
      result = await this.createGitHubPR(repoFullPath, options);
    }

    // Set context variables for use in subsequent nodes
    // These can be accessed via {{ ctx.mrUrl }}, {{ ctx.prUrl }}, etc.
    this.setContext(ctx, 'mrUrl', result.mrUrl || result.prUrl);
    this.setContext(ctx, 'prUrl', result.prUrl || result.mrUrl);
    this.setContext(ctx, 'mrId', result.mrId || result.prId);
    this.setContext(ctx, 'prId', result.prId || result.mrId);

    return result;
  }

  /**
   * Create GitLab Merge Request
   */
  private async createGitLabMR(
    repoFullPath: string,
    options: MROptions,
  ): Promise<Record<string, unknown>> {
    const encodedPath = encodeURIComponent(repoFullPath);
    const url = `https://gitlab.com/api/v4/projects/${encodedPath}/merge_requests`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': options.token,
      },
      body: JSON.stringify({
        source_branch: options.sourceBranch,
        target_branch: options.targetBranch,
        title: options.title,
        description: options.description || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitLab API error (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = `GitLab: ${JSON.stringify(errorJson.message)}`;
        }
      } catch {
        errorMessage = `GitLab API error: ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const mr = (await response.json()) as { iid: number; web_url: string };

    logger.info(`Created MR #${mr.iid}: ${mr.web_url}`);

    return {
      created: true,
      mrId: mr.iid,
      mrUrl: mr.web_url,
      prUrl: mr.web_url,  // Alias for consistency
      url: mr.web_url,    // Generic alias
      provider: 'gitlab',
    };
  }

  /**
   * Create GitHub Pull Request
   */
  private async createGitHubPR(
    repoFullPath: string,
    options: MROptions,
  ): Promise<Record<string, unknown>> {
    const url = `https://api.github.com/repos/${repoFullPath}/pulls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Mitshe-Workflow',
      },
      body: JSON.stringify({
        head: options.sourceBranch,
        base: options.targetBranch,
        title: options.title,
        body: options.description || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub API error (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);

        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          const details = errorJson.errors
            .map(
              (e: { field?: string; code?: string; message?: string }) =>
                `${e.field || 'unknown'}: ${e.message || e.code || 'error'}`,
            )
            .join(', ');
          errorMessage = `GitHub: ${errorJson.message || 'Validation failed'} (${details})`;
        } else if (errorJson.message) {
          errorMessage = `GitHub: ${errorJson.message}`;
        }
      } catch {
        errorMessage = `GitHub API error: ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const pr = (await response.json()) as { number: number; html_url: string };

    logger.info(`Created PR #${pr.number}: ${pr.html_url}`);

    return {
      created: true,
      prId: pr.number,
      prUrl: pr.html_url,
      mrUrl: pr.html_url,  // Alias for consistency
      url: pr.html_url,    // Generic alias
      provider: 'github',
    };
  }
}
