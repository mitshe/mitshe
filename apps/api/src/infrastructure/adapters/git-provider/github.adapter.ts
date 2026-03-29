import { Logger } from '@nestjs/common';
import {
  GitProviderPort,
  Repository,
  Branch,
  MergeRequest,
  Commit,
  CommitInput,
  CreateMergeRequestInput,
} from '../../../ports/git-provider.port';

/**
 * GitHub REST API Adapter
 *
 * Supports GitHub.com and GitHub Enterprise
 *
 * Authentication:
 * - Personal Access Token (classic or fine-grained)
 * - GitHub App installation token
 *
 * @see https://docs.github.com/en/rest
 */
export class GitHubAdapter implements GitProviderPort {
  private readonly logger = new Logger(GitHubAdapter.name);
  private readonly baseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly token: string;

  constructor(config: {
    baseUrl?: string; // e.g., https://github.com or https://github.yourcompany.com
    accessToken: string;
  }) {
    this.baseUrl = (config.baseUrl || 'https://github.com').replace(/\/+$/, '');
    this.token = config.accessToken;

    // GitHub Enterprise uses /api/v3 path, GitHub.com uses api.github.com
    if (this.baseUrl === 'https://github.com') {
      this.apiBaseUrl = 'https://api.github.com';
    } else {
      this.apiBaseUrl = `${this.baseUrl}/api/v3`;
    }
  }

  getProviderType(): 'github' {
    return 'github';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.request('/user');
      this.logger.log(`GitHub connection successful for user: ${user.login}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`GitHub connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async listRepositories(options?: {
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<Repository[]> {
    const params = new URLSearchParams({
      per_page: String(options?.limit || 30),
      page: String(options?.page || 1),
      sort: 'updated',
    });

    let repos: any[];

    if (options?.search) {
      // Use search API for filtering
      const searchParams = new URLSearchParams({
        q: `${options.search} in:name user:@me`,
        per_page: String(options?.limit || 30),
      });
      const result = await this.request(`/search/repositories?${searchParams}`);
      repos = result.items || [];
    } else {
      repos = await this.request(`/user/repos?${params}`);
    }

    return repos.map((r: any) => this.mapRepository(r));
  }

  async getRepository(repoId: string): Promise<Repository> {
    // repoId can be "owner/repo" or just the full name
    const repo = await this.request(`/repos/${repoId}`);
    return this.mapRepository(repo);
  }

  async listBranches(
    repoId: string,
    options?: { search?: string; limit?: number },
  ): Promise<Branch[]> {
    const params = new URLSearchParams({
      per_page: String(options?.limit || 100),
    });

    const branches = await this.request(`/repos/${repoId}/branches?${params}`);

    // Get default branch to mark it
    const repo = await this.request(`/repos/${repoId}`);
    const defaultBranch = repo.default_branch;

    return branches
      .filter(
        (b: any) =>
          !options?.search ||
          b.name.toLowerCase().includes(options.search.toLowerCase()),
      )
      .map((b: any) => ({
        name: b.name,
        sha: b.commit?.sha || '',
        isDefault: b.name === defaultBranch,
        isProtected: b.protected || false,
      }));
  }

  async createBranch(
    repoId: string,
    branchName: string,
    fromRef: string,
  ): Promise<Branch> {
    // First, get the SHA of the source ref
    let sha = fromRef;

    // If fromRef is a branch name, get its SHA
    if (!fromRef.match(/^[0-9a-f]{40}$/i)) {
      const ref = await this.request(
        `/repos/${repoId}/git/ref/heads/${fromRef}`,
      );
      sha = ref.object.sha;
    }

    // Create the new ref
    await this.request(`/repos/${repoId}/git/refs`, {
      method: 'POST',
      body: {
        ref: `refs/heads/${branchName}`,
        sha,
      },
    });

    return {
      name: branchName,
      sha,
      isDefault: false,
      isProtected: false,
    };
  }

  async commitFiles(repoId: string, input: CommitInput): Promise<Commit> {
    // GitHub's API requires us to create a tree and commit
    // For simplicity, we'll use the contents API for single file commits
    // or create a more complex flow for multiple files

    if (input.files.length === 1 && input.files[0].action !== 'delete') {
      // Simple single file commit using contents API
      const file = input.files[0];
      let sha: string | undefined;

      // Get current file SHA if updating
      if (file.action === 'update') {
        try {
          const existing = await this.request(
            `/repos/${repoId}/contents/${file.path}?ref=${input.branch}`,
          );
          sha = existing.sha;
        } catch {
          // File doesn't exist, will create
        }
      }

      const result = await this.request(
        `/repos/${repoId}/contents/${file.path}`,
        {
          method: 'PUT',
          body: {
            message: input.message,
            content: Buffer.from(file.content).toString('base64'),
            branch: input.branch,
            sha,
            committer: input.authorName
              ? {
                  name: input.authorName,
                  email: input.authorEmail || 'noreply@github.com',
                }
              : undefined,
          },
        },
      );

      return {
        sha: result.commit.sha,
        message: input.message,
        author: result.commit.author?.name || 'unknown',
        createdAt: result.commit.author?.date || new Date().toISOString(),
        webUrl: result.commit.html_url,
      };
    }

    // Multiple files: use the Git Data API
    // 1. Get the latest commit SHA
    const ref = await this.request(
      `/repos/${repoId}/git/ref/heads/${input.startBranch || input.branch}`,
    );
    const latestCommitSha = ref.object.sha;

    // 2. Get the base tree
    const baseCommit = await this.request(
      `/repos/${repoId}/git/commits/${latestCommitSha}`,
    );
    const baseTreeSha = baseCommit.tree.sha;

    // 3. Create blobs for each file
    const treeItems = await Promise.all(
      input.files.map(async (file) => {
        if (file.action === 'delete') {
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: null,
          };
        }

        const blob = await this.request(`/repos/${repoId}/git/blobs`, {
          method: 'POST',
          body: {
            content: file.content,
            encoding: file.encoding === 'base64' ? 'base64' : 'utf-8',
          },
        });

        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      }),
    );

    // 4. Create new tree
    const newTree = await this.request(`/repos/${repoId}/git/trees`, {
      method: 'POST',
      body: {
        base_tree: baseTreeSha,
        tree: treeItems,
      },
    });

    // 5. Create commit
    const commitBody: Record<string, any> = {
      message: input.message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    };

    if (input.authorName) {
      commitBody.author = {
        name: input.authorName,
        email: input.authorEmail || 'noreply@github.com',
        date: new Date().toISOString(),
      };
    }

    const newCommit = await this.request(`/repos/${repoId}/git/commits`, {
      method: 'POST',
      body: commitBody,
    });

    // 6. Update ref
    await this.request(`/repos/${repoId}/git/refs/heads/${input.branch}`, {
      method: 'PATCH',
      body: { sha: newCommit.sha },
    });

    return {
      sha: newCommit.sha,
      message: newCommit.message,
      author: newCommit.author?.name || 'unknown',
      createdAt: newCommit.author?.date || new Date().toISOString(),
      webUrl: `${this.baseUrl}/${repoId}/commit/${newCommit.sha}`,
    };
  }

  async listMergeRequests(
    repoId: string,
    options?: {
      state?: 'open' | 'closed' | 'merged' | 'all';
      sourceBranch?: string;
      targetBranch?: string;
      limit?: number;
    },
  ): Promise<MergeRequest[]> {
    const params = new URLSearchParams({
      per_page: String(options?.limit || 30),
    });

    // GitHub uses 'open', 'closed', or 'all' for state
    if (options?.state === 'merged') {
      params.set('state', 'closed');
    } else if (options?.state && options.state !== 'all') {
      params.set('state', options.state);
    } else {
      params.set('state', 'all');
    }

    if (options?.sourceBranch) {
      params.set('head', options.sourceBranch);
    }

    if (options?.targetBranch) {
      params.set('base', options.targetBranch);
    }

    let prs = await this.request(`/repos/${repoId}/pulls?${params}`);

    // Filter merged if needed
    if (options?.state === 'merged') {
      prs = prs.filter((pr: any) => pr.merged_at);
    }

    return prs.map((pr: any) => this.mapPullRequest(pr));
  }

  async getMergeRequest(repoId: string, mrId: number): Promise<MergeRequest> {
    const pr = await this.request(`/repos/${repoId}/pulls/${mrId}`);
    return this.mapPullRequest(pr);
  }

  async createMergeRequest(
    repoId: string,
    input: CreateMergeRequestInput,
  ): Promise<MergeRequest> {
    const body: Record<string, any> = {
      title: input.title,
      head: input.sourceBranch,
      base: input.targetBranch,
      draft: input.draft || false,
    };

    if (input.description) {
      body.body = input.description;
    }

    const pr = await this.request(`/repos/${repoId}/pulls`, {
      method: 'POST',
      body,
    });

    // Add labels if specified
    if (input.labels && input.labels.length > 0) {
      await this.request(`/repos/${repoId}/issues/${pr.number}/labels`, {
        method: 'POST',
        body: { labels: input.labels },
      });
    }

    // Add assignees if specified
    if (input.assignees && input.assignees.length > 0) {
      await this.request(`/repos/${repoId}/issues/${pr.number}/assignees`, {
        method: 'POST',
        body: { assignees: input.assignees },
      });
    }

    // Request reviewers if specified
    if (input.reviewers && input.reviewers.length > 0) {
      await this.request(
        `/repos/${repoId}/pulls/${pr.number}/requested_reviewers`,
        {
          method: 'POST',
          body: { reviewers: input.reviewers },
        },
      );
    }

    return this.getMergeRequest(repoId, pr.number);
  }

  async updateMergeRequest(
    repoId: string,
    mrId: number,
    input: Partial<CreateMergeRequestInput>,
  ): Promise<MergeRequest> {
    const body: Record<string, any> = {};

    if (input.title) {
      body.title = input.title;
    }

    if (input.description !== undefined) {
      body.body = input.description;
    }

    if (input.targetBranch) {
      body.base = input.targetBranch;
    }

    if (Object.keys(body).length > 0) {
      await this.request(`/repos/${repoId}/pulls/${mrId}`, {
        method: 'PATCH',
        body,
      });
    }

    // Update labels
    if (input.labels) {
      await this.request(`/repos/${repoId}/issues/${mrId}/labels`, {
        method: 'PUT',
        body: { labels: input.labels },
      });
    }

    // Update assignees
    if (input.assignees) {
      // First remove all, then add new
      const pr = await this.request(`/repos/${repoId}/pulls/${mrId}`);
      const currentAssignees = pr.assignees?.map((a: any) => a.login) || [];

      if (currentAssignees.length > 0) {
        await this.request(`/repos/${repoId}/issues/${mrId}/assignees`, {
          method: 'DELETE',
          body: { assignees: currentAssignees },
        });
      }

      if (input.assignees.length > 0) {
        await this.request(`/repos/${repoId}/issues/${mrId}/assignees`, {
          method: 'POST',
          body: { assignees: input.assignees },
        });
      }
    }

    return this.getMergeRequest(repoId, mrId);
  }

  async mergeMergeRequest(
    repoId: string,
    mrId: number,
    options?: {
      commitMessage?: string;
      squash?: boolean;
      deleteSourceBranch?: boolean;
    },
  ): Promise<void> {
    const body: Record<string, any> = {};

    if (options?.commitMessage) {
      body.commit_title = options.commitMessage.split('\n')[0];
      body.commit_message = options.commitMessage;
    }

    if (options?.squash) {
      body.merge_method = 'squash';
    }

    await this.request(`/repos/${repoId}/pulls/${mrId}/merge`, {
      method: 'PUT',
      body,
    });

    // Delete source branch if requested
    if (options?.deleteSourceBranch) {
      const pr = await this.request(`/repos/${repoId}/pulls/${mrId}`);
      try {
        await this.request(`/repos/${repoId}/git/refs/heads/${pr.head.ref}`, {
          method: 'DELETE',
        });
      } catch (error) {
        this.logger.warn(`Failed to delete source branch: ${error.message}`);
      }
    }
  }

  async addMergeRequestComment(
    repoId: string,
    mrId: number,
    comment: string,
  ): Promise<{ id: string; body: string }> {
    // GitHub uses the issues API for PR comments
    const result = await this.request(
      `/repos/${repoId}/issues/${mrId}/comments`,
      {
        method: 'POST',
        body: { body: comment },
      },
    );

    return {
      id: String(result.id),
      body: result.body,
    };
  }

  async getFileContent(
    repoId: string,
    filePath: string,
    ref?: string,
  ): Promise<string> {
    const params = new URLSearchParams();
    if (ref) {
      params.set('ref', ref);
    }

    const file = await this.request(
      `/repos/${repoId}/contents/${filePath}?${params}`,
    );

    if (file.type !== 'file') {
      throw new Error(`${filePath} is not a file`);
    }

    // GitHub returns base64 encoded content
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }

  async listFiles(
    repoId: string,
    path: string,
    ref?: string,
  ): Promise<
    Array<{ name: string; path: string; type: 'file' | 'directory' }>
  > {
    const params = new URLSearchParams();
    if (ref) {
      params.set('ref', ref);
    }

    const contents = await this.request(
      `/repos/${repoId}/contents/${path}?${params}`,
    );

    // Handle single file response
    if (!Array.isArray(contents)) {
      return [
        {
          name: contents.name,
          path: contents.path,
          type: contents.type === 'dir' ? 'directory' : 'file',
        },
      ];
    }

    return contents.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type === 'dir' ? 'directory' : 'file',
    }));
  }

  // Private helper methods

  private async request(
    path: string,
    options: {
      method?: string;
      body?: any;
    } = {},
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${path}`;
    const method = options.method || 'GET';

    this.logger.debug(`GitHub API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
        if (errorJson.errors) {
          errorMessage +=
            ': ' + errorJson.errors.map((e: any) => e.message).join(', ');
        }
      } catch {
        // Use default error message
      }

      this.logger.error(`GitHub API Error: ${errorMessage}`, errorBody);
      throw new Error(errorMessage);
    }

    // Handle empty responses
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  }

  private mapRepository(data: any): Repository {
    return {
      id: data.full_name, // Use full_name as ID for consistency
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      cloneUrl: data.clone_url,
      webUrl: data.html_url,
      visibility: data.private ? 'private' : 'public',
    };
  }

  private mapPullRequest(data: any): MergeRequest {
    let status: MergeRequest['status'] = 'open';
    if (data.merged_at) {
      status = 'merged';
    } else if (data.state === 'closed') {
      status = 'closed';
    } else if (data.draft) {
      status = 'draft';
    }

    return {
      id: String(data.id),
      iid: data.number,
      title: data.title,
      description: data.body,
      sourceBranch: data.head?.ref || '',
      targetBranch: data.base?.ref || '',
      status,
      webUrl: data.html_url,
      author: data.user?.login || 'unknown',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      labels: data.labels?.map((l: any) => l.name) || [],
      reviewers: data.requested_reviewers?.map((r: any) => r.login) || [],
    };
  }
}

/**
 * Factory function to create GitHub adapter
 */
export function createGitHubAdapter(config: {
  baseUrl?: string;
  accessToken: string;
}): GitProviderPort {
  return new GitHubAdapter(config);
}
