/**
 * Port for Git provider integrations (GitLab, GitHub)
 */
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  cloneUrl: string;
  webUrl: string;
  visibility: 'public' | 'private' | 'internal';
}

export interface Branch {
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected?: boolean;
}

export interface MergeRequest {
  id: string;
  iid: number; // Internal ID (for GitLab) / PR number for GitHub
  title: string;
  description: string | null;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  webUrl: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  reviewers?: string[];
}

export interface CreateMergeRequestInput {
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
  draft?: boolean;
}

export interface FileChange {
  path: string;
  content: string;
  action: 'create' | 'update' | 'delete';
  encoding?: 'text' | 'base64';
}

export interface CommitInput {
  branch: string;
  message: string;
  files: FileChange[];
  startBranch?: string; // Create new branch from this
  authorName?: string;
  authorEmail?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  createdAt: string;
  webUrl: string;
}

export interface GitProviderPort {
  /**
   * Provider type identifier
   */
  getProviderType(): 'gitlab' | 'github';

  /**
   * Test connection
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * List accessible repositories
   */
  listRepositories(options?: {
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<Repository[]>;

  /**
   * Get repository info
   */
  getRepository(repoId: string): Promise<Repository>;

  /**
   * List branches
   */
  listBranches(
    repoId: string,
    options?: {
      search?: string;
      limit?: number;
    },
  ): Promise<Branch[]>;

  /**
   * Create a new branch
   */
  createBranch(
    repoId: string,
    branchName: string,
    fromRef: string,
  ): Promise<Branch>;

  /**
   * Commit files to a branch
   */
  commitFiles(repoId: string, input: CommitInput): Promise<Commit>;

  /**
   * List merge/pull requests
   */
  listMergeRequests(
    repoId: string,
    options?: {
      state?: 'open' | 'closed' | 'merged' | 'all';
      sourceBranch?: string;
      targetBranch?: string;
      limit?: number;
    },
  ): Promise<MergeRequest[]>;

  /**
   * Get merge/pull request by ID
   */
  getMergeRequest(repoId: string, mrId: number): Promise<MergeRequest>;

  /**
   * Create a merge/pull request
   */
  createMergeRequest(
    repoId: string,
    input: CreateMergeRequestInput,
  ): Promise<MergeRequest>;

  /**
   * Update merge/pull request
   */
  updateMergeRequest(
    repoId: string,
    mrId: number,
    input: Partial<CreateMergeRequestInput>,
  ): Promise<MergeRequest>;

  /**
   * Merge a merge/pull request
   */
  mergeMergeRequest(
    repoId: string,
    mrId: number,
    options?: {
      commitMessage?: string;
      squash?: boolean;
      deleteSourceBranch?: boolean;
    },
  ): Promise<void>;

  /**
   * Add comment to merge request
   */
  addMergeRequestComment(
    repoId: string,
    mrId: number,
    comment: string,
  ): Promise<{ id: string; body: string }>;

  /**
   * Get file content from repository
   */
  getFileContent(
    repoId: string,
    filePath: string,
    ref?: string,
  ): Promise<string>;

  /**
   * List files in a directory
   */
  listFiles(
    repoId: string,
    path: string,
    ref?: string,
  ): Promise<
    Array<{
      name: string;
      path: string;
      type: 'file' | 'directory';
    }>
  >;
}

export const GIT_PROVIDER_PORT = Symbol('GitProviderPort');
