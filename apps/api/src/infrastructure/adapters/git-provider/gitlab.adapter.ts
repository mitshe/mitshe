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
 * GitLab REST API v4 Adapter
 *
 * Supports both GitLab.com and self-hosted GitLab instances
 *
 * Authentication:
 * - Personal Access Token (PRIVATE-TOKEN header)
 * - OAuth2 Access Token (Authorization: Bearer header)
 *
 * @see https://docs.gitlab.com/api/rest/
 */
export class GitLabAdapter implements GitProviderPort {
  private readonly logger = new Logger(GitLabAdapter.name);
  private readonly baseUrl: string;
  private readonly authHeader: Record<string, string>;

  constructor(config: {
    baseUrl?: string; // e.g., https://gitlab.com or https://gitlab.yourcompany.com
    accessToken: string;
    tokenType?: 'private' | 'oauth'; // Default: private
  }) {
    this.baseUrl = (config.baseUrl || 'https://gitlab.com').replace(/\/+$/, '');

    // Build auth header based on token type
    if (config.tokenType === 'oauth') {
      this.authHeader = { Authorization: `Bearer ${config.accessToken}` };
    } else {
      this.authHeader = { 'PRIVATE-TOKEN': config.accessToken };
    }
  }

  getProviderType(): 'gitlab' {
    return 'gitlab';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.request('/api/v4/user');
      this.logger.log(
        `GitLab connection successful for user: ${user.username}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`GitLab connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async listRepositories(options?: {
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<Repository[]> {
    const params = new URLSearchParams({
      membership: 'true',
      per_page: String(options?.limit || 20),
      page: String(options?.page || 1),
    });

    if (options?.search) {
      params.set('search', options.search);
    }

    const projects = await this.request(`/api/v4/projects?${params}`);
    return projects.map((p: any) => this.mapRepository(p));
  }

  async getRepository(repoId: string): Promise<Repository> {
    const encodedId = encodeURIComponent(repoId);
    const project = await this.request(`/api/v4/projects/${encodedId}`);
    return this.mapRepository(project);
  }

  async listBranches(
    repoId: string,
    options?: { search?: string; limit?: number },
  ): Promise<Branch[]> {
    const encodedId = encodeURIComponent(repoId);
    const params = new URLSearchParams({
      per_page: String(options?.limit || 100),
    });

    if (options?.search) {
      params.set('search', options.search);
    }

    const branches = await this.request(
      `/api/v4/projects/${encodedId}/repository/branches?${params}`,
    );

    return branches.map((b: any) => ({
      name: b.name,
      sha: b.commit?.id || '',
      isDefault: b.default || false,
      isProtected: b.protected || false,
    }));
  }

  async createBranch(
    repoId: string,
    branchName: string,
    fromRef: string,
  ): Promise<Branch> {
    const encodedId = encodeURIComponent(repoId);

    const branch = await this.request(
      `/api/v4/projects/${encodedId}/repository/branches`,
      {
        method: 'POST',
        body: {
          branch: branchName,
          ref: fromRef,
        },
      },
    );

    return {
      name: branch.name,
      sha: branch.commit?.id || '',
      isDefault: false,
      isProtected: branch.protected || false,
    };
  }

  async commitFiles(repoId: string, input: CommitInput): Promise<Commit> {
    const encodedId = encodeURIComponent(repoId);

    // Build actions array for GitLab commits API
    const actions = input.files.map((file) => ({
      action: file.action,
      file_path: file.path,
      content: file.action !== 'delete' ? file.content : undefined,
      encoding: file.encoding === 'base64' ? 'base64' : 'text',
    }));

    const body: Record<string, any> = {
      branch: input.branch,
      commit_message: input.message,
      actions,
    };

    if (input.startBranch) {
      body.start_branch = input.startBranch;
    }

    if (input.authorName) {
      body.author_name = input.authorName;
    }

    if (input.authorEmail) {
      body.author_email = input.authorEmail;
    }

    const commit = await this.request(
      `/api/v4/projects/${encodedId}/repository/commits`,
      {
        method: 'POST',
        body,
      },
    );

    return {
      sha: commit.id,
      message: commit.message,
      author: commit.author_name,
      createdAt: commit.created_at,
      webUrl: commit.web_url,
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
    const encodedId = encodeURIComponent(repoId);
    const params = new URLSearchParams({
      per_page: String(options?.limit || 20),
    });

    if (options?.state && options.state !== 'all') {
      params.set('state', options.state);
    }

    if (options?.sourceBranch) {
      params.set('source_branch', options.sourceBranch);
    }

    if (options?.targetBranch) {
      params.set('target_branch', options.targetBranch);
    }

    const mrs = await this.request(
      `/api/v4/projects/${encodedId}/merge_requests?${params}`,
    );

    return mrs.map((mr: any) => this.mapMergeRequest(mr));
  }

  async getMergeRequest(repoId: string, mrId: number): Promise<MergeRequest> {
    const encodedId = encodeURIComponent(repoId);
    const mr = await this.request(
      `/api/v4/projects/${encodedId}/merge_requests/${mrId}`,
    );
    return this.mapMergeRequest(mr);
  }

  async createMergeRequest(
    repoId: string,
    input: CreateMergeRequestInput,
  ): Promise<MergeRequest> {
    const encodedId = encodeURIComponent(repoId);

    const body: Record<string, any> = {
      source_branch: input.sourceBranch,
      target_branch: input.targetBranch,
      title: input.draft ? `Draft: ${input.title}` : input.title,
    };

    if (input.description) {
      body.description = input.description;
    }

    if (input.labels && input.labels.length > 0) {
      body.labels = input.labels.join(',');
    }

    if (input.assignees && input.assignees.length > 0) {
      body.assignee_ids = input.assignees;
    }

    if (input.reviewers && input.reviewers.length > 0) {
      body.reviewer_ids = input.reviewers;
    }

    const mr = await this.request(
      `/api/v4/projects/${encodedId}/merge_requests`,
      {
        method: 'POST',
        body,
      },
    );

    return this.mapMergeRequest(mr);
  }

  async updateMergeRequest(
    repoId: string,
    mrId: number,
    input: Partial<CreateMergeRequestInput>,
  ): Promise<MergeRequest> {
    const encodedId = encodeURIComponent(repoId);

    const body: Record<string, any> = {};

    if (input.title) {
      body.title = input.title;
    }

    if (input.description !== undefined) {
      body.description = input.description;
    }

    if (input.labels) {
      body.labels = input.labels.join(',');
    }

    if (input.assignees) {
      body.assignee_ids = input.assignees;
    }

    if (input.reviewers) {
      body.reviewer_ids = input.reviewers;
    }

    const mr = await this.request(
      `/api/v4/projects/${encodedId}/merge_requests/${mrId}`,
      {
        method: 'PUT',
        body,
      },
    );

    return this.mapMergeRequest(mr);
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
    const encodedId = encodeURIComponent(repoId);

    const body: Record<string, any> = {};

    if (options?.commitMessage) {
      body.merge_commit_message = options.commitMessage;
    }

    if (options?.squash !== undefined) {
      body.squash = options.squash;
    }

    if (options?.deleteSourceBranch !== undefined) {
      body.should_remove_source_branch = options.deleteSourceBranch;
    }

    await this.request(
      `/api/v4/projects/${encodedId}/merge_requests/${mrId}/merge`,
      {
        method: 'PUT',
        body,
      },
    );
  }

  async addMergeRequestComment(
    repoId: string,
    mrId: number,
    comment: string,
  ): Promise<{ id: string; body: string }> {
    const encodedId = encodeURIComponent(repoId);

    const note = await this.request(
      `/api/v4/projects/${encodedId}/merge_requests/${mrId}/notes`,
      {
        method: 'POST',
        body: { body: comment },
      },
    );

    return {
      id: String(note.id),
      body: note.body,
    };
  }

  async getFileContent(
    repoId: string,
    filePath: string,
    ref?: string,
  ): Promise<string> {
    const encodedId = encodeURIComponent(repoId);
    const encodedPath = encodeURIComponent(filePath);

    const params = new URLSearchParams();
    if (ref) {
      params.set('ref', ref);
    }

    const file = await this.request(
      `/api/v4/projects/${encodedId}/repository/files/${encodedPath}?${params}`,
    );

    // GitLab returns base64 encoded content
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }

  async listFiles(
    repoId: string,
    path: string,
    ref?: string,
  ): Promise<
    Array<{ name: string; path: string; type: 'file' | 'directory' }>
  > {
    const encodedId = encodeURIComponent(repoId);

    const params = new URLSearchParams({
      path: path || '',
      per_page: '100',
    });

    if (ref) {
      params.set('ref', ref);
    }

    const tree = await this.request(
      `/api/v4/projects/${encodedId}/repository/tree?${params}`,
    );

    return tree.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type === 'tree' ? 'directory' : 'file',
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
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';

    this.logger.debug(`GitLab API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      ...this.authHeader,
      Accept: 'application/json',
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
      let errorMessage = `GitLab API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message)
            ? errorJson.message.join(', ')
            : errorJson.message;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // Use default error message
      }

      this.logger.error(`GitLab API Error: ${errorMessage}`, errorBody);
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  }

  private mapRepository(data: any): Repository {
    return {
      id: String(data.id),
      name: data.name,
      fullName: data.path_with_namespace,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      cloneUrl: data.http_url_to_repo || data.ssh_url_to_repo,
      webUrl: data.web_url,
      visibility: data.visibility as 'public' | 'private' | 'internal',
    };
  }

  private mapMergeRequest(data: any): MergeRequest {
    let status: MergeRequest['status'] = 'open';
    if (data.state === 'merged') {
      status = 'merged';
    } else if (data.state === 'closed') {
      status = 'closed';
    } else if (data.draft || data.work_in_progress) {
      status = 'draft';
    }

    return {
      id: String(data.id),
      iid: data.iid,
      title: data.title,
      description: data.description,
      sourceBranch: data.source_branch,
      targetBranch: data.target_branch,
      status,
      webUrl: data.web_url,
      author: data.author?.username || 'unknown',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      labels: data.labels || [],
      reviewers: data.reviewers?.map((r: any) => r.username) || [],
    };
  }
}

/**
 * Factory function to create GitLab adapter
 */
export function createGitLabAdapter(config: {
  baseUrl?: string;
  accessToken: string;
  tokenType?: 'private' | 'oauth';
}): GitProviderPort {
  return new GitLabAdapter(config);
}
