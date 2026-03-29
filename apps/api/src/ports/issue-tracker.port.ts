/**
 * Port for issue tracker integrations (JIRA, YouTrack, Linear)
 */

export interface IssueComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Issue {
  id: string;
  key: string; // e.g., "PROJ-123"
  title: string;
  description: string | null;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
  priority?: string;
  issueType: string;
  labels: string[];
  assignee: string | null;
  reporter?: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  comments?: IssueComment[];
  customFields?: Record<string, unknown>;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  url: string;
}

export interface IssueTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory: string;
  };
}

export interface CreateIssueInput {
  projectKey: string;
  issueType?: string; // Task, Bug, Story, etc.
  title: string;
  description?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, unknown>;
}

export interface SearchIssuesInput {
  jql?: string; // JIRA Query Language
  projectKey?: string;
  status?: string | string[];
  assignee?: string;
  labels?: string[];
  maxResults?: number;
  startAt?: number;
}

export interface SearchResult {
  issues: Issue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface IssueTrackerPort {
  /**
   * Provider type identifier
   */
  getProviderType(): 'jira' | 'youtrack' | 'linear' | 'github_issues';

  /**
   * Check if connection is valid
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * List available projects
   */
  getProjects(): Promise<Project[]>;

  /**
   * Get issue by ID or key
   */
  getIssue(issueKey: string): Promise<Issue>;

  /**
   * Search issues with query
   */
  searchIssues(input: SearchIssuesInput): Promise<SearchResult>;

  /**
   * Create a new issue
   */
  createIssue(input: CreateIssueInput): Promise<Issue>;

  /**
   * Update an existing issue
   */
  updateIssue(issueKey: string, input: UpdateIssueInput): Promise<Issue>;

  /**
   * Add a comment to an issue
   */
  addComment(issueKey: string, comment: string): Promise<IssueComment>;

  /**
   * Get available transitions for an issue
   */
  getTransitions(issueKey: string): Promise<IssueTransition[]>;

  /**
   * Transition issue to a new status
   */
  transitionIssue(issueKey: string, transitionId: string): Promise<void>;

  /**
   * Delete an issue (if supported)
   */
  deleteIssue?(issueKey: string): Promise<void>;
}

export const ISSUE_TRACKER_PORT = Symbol('IssueTrackerPort');
