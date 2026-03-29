import { Logger } from '@nestjs/common';
import {
  IssueTrackerPort,
  Issue,
  Project,
  IssueComment,
  IssueTransition,
  CreateIssueInput,
  UpdateIssueInput,
  SearchIssuesInput,
  SearchResult,
} from '../../../ports/issue-tracker.port';
import { textToAdf, adfToText, simplifyJiraValue } from './jira-adf-converter';

/**
 * JIRA REST API v3 Adapter
 *
 * Supports both Jira Cloud and Jira Server/Data Center
 *
 * Authentication:
 * - Cloud: API Token (email:token as Basic Auth)
 * - Server: Basic Auth or Personal Access Token
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 */
export class JiraAdapter implements IssueTrackerPort {
  private readonly logger = new Logger(JiraAdapter.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly isCloud: boolean;

  constructor(config: {
    baseUrl: string; // e.g., https://yourcompany.atlassian.net or https://jira.yourcompany.com
    email?: string; // Required for Cloud
    apiToken: string; // API Token for Cloud, PAT for Server
    isCloud?: boolean;
  }) {
    // Normalize base URL
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.isCloud = config.isCloud ?? config.baseUrl.includes('atlassian.net');

    // Build auth header
    if (this.isCloud && config.email) {
      // Cloud: Basic Auth with email:apiToken
      const credentials = Buffer.from(
        `${config.email}:${config.apiToken}`,
      ).toString('base64');
      this.authHeader = `Basic ${credentials}`;
    } else {
      // Server: Bearer token or Basic auth
      if (config.apiToken.length > 50) {
        // Likely a PAT
        this.authHeader = `Bearer ${config.apiToken}`;
      } else {
        this.authHeader = `Basic ${Buffer.from(config.apiToken).toString('base64')}`;
      }
    }
  }

  getProviderType(): 'jira' {
    return 'jira';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('/rest/api/3/myself');
      if (response.accountId || response.key) {
        this.logger.log(
          `JIRA connection successful for user: ${response.displayName}`,
        );
        return { success: true };
      }
      return { success: false, error: 'Invalid response from JIRA' };
    } catch (error) {
      this.logger.error(`JIRA connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.request('/rest/api/3/project');

    return response.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      url: `${this.baseUrl}/browse/${p.key}`,
    }));
  }

  async getIssue(issueKey: string): Promise<Issue> {
    const response = await this.request(
      `/rest/api/3/issue/${issueKey}?expand=names,changelog`,
    );

    return this.mapIssue(response);
  }

  /**
   * Get raw issue data from Jira (for importing with full metadata)
   */
  async getRawIssue(issueKey: string): Promise<{
    issue: Issue;
    raw: Record<string, unknown>;
  }> {
    const response = await this.request(
      `/rest/api/3/issue/${issueKey}?expand=names,changelog,renderedFields`,
    );

    const fields = response.fields;

    // Build a clean raw object with all useful data
    const raw: Record<string, unknown> = {
      id: response.id,
      key: response.key,
      self: response.self,
      summary: fields.summary,
      description: fields.description,
      descriptionText: fields.description
        ? adfToText(fields.description)
        : null,
      status: {
        id: fields.status?.id,
        name: fields.status?.name,
        category: fields.status?.statusCategory?.key,
      },
      priority: {
        id: fields.priority?.id,
        name: fields.priority?.name,
      },
      issuetype: {
        id: fields.issuetype?.id,
        name: fields.issuetype?.name,
        subtask: fields.issuetype?.subtask,
      },
      project: {
        id: fields.project?.id,
        key: fields.project?.key,
        name: fields.project?.name,
      },
      assignee: fields.assignee
        ? {
            accountId: fields.assignee.accountId,
            displayName: fields.assignee.displayName,
            emailAddress: fields.assignee.emailAddress,
          }
        : null,
      reporter: fields.reporter
        ? {
            accountId: fields.reporter.accountId,
            displayName: fields.reporter.displayName,
            emailAddress: fields.reporter.emailAddress,
          }
        : null,
      labels: fields.labels || [],
      components: (fields.components || []).map((c: any) => ({
        id: c.id,
        name: c.name,
      })),
      fixVersions: (fields.fixVersions || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        released: v.released,
      })),
      versions: (fields.versions || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        released: v.released,
      })),
      parent: fields.parent
        ? {
            id: fields.parent.id,
            key: fields.parent.key,
            summary: fields.parent.fields?.summary,
          }
        : null,
      subtasks: (fields.subtasks || []).map((s: any) => ({
        id: s.id,
        key: s.key,
        summary: s.fields?.summary,
        status: s.fields?.status?.name,
      })),
      created: fields.created,
      updated: fields.updated,
      duedate: fields.duedate,
      resolutiondate: fields.resolutiondate,
      resolution: fields.resolution?.name,
      timetracking: fields.timetracking,
      customFields: this.extractCustomFields(fields, response.names),
      url: `${this.baseUrl}/browse/${response.key}`,
    };

    return {
      issue: this.mapIssue(response),
      raw,
    };
  }

  /**
   * Extract custom fields from Jira response
   */
  private extractCustomFields(
    fields: Record<string, any>,
    names: Record<string, string>,
  ): Record<string, unknown> {
    const customFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('customfield_') && value !== null) {
        const fieldName = names?.[key] || key;
        // Store with both the ID and friendly name
        customFields[key] = {
          name: fieldName,
          value: simplifyJiraValue(value),
        };
      }
    }

    return customFields;
  }


  async searchIssues(input: SearchIssuesInput): Promise<SearchResult> {
    // Build JQL query
    let jql = input.jql || '';

    if (!jql) {
      const conditions: string[] = [];

      if (input.projectKey) {
        conditions.push(`project = "${input.projectKey}"`);
      }

      if (input.status) {
        const statuses = Array.isArray(input.status)
          ? input.status
          : [input.status];
        conditions.push(
          `status IN (${statuses.map((s) => `"${s}"`).join(', ')})`,
        );
      }

      if (input.assignee) {
        conditions.push(
          input.assignee === 'unassigned'
            ? 'assignee IS EMPTY'
            : `assignee = "${input.assignee}"`,
        );
      }

      if (input.labels && input.labels.length > 0) {
        conditions.push(
          `labels IN (${input.labels.map((l) => `"${l}"`).join(', ')})`,
        );
      }

      jql = conditions.join(' AND ');
    }

    const params = new URLSearchParams({
      jql: jql || 'order by updated DESC',
      maxResults: String(input.maxResults || 50),
      startAt: String(input.startAt || 0),
    });

    const response = await this.request(`/rest/api/3/search?${params}`);

    return {
      issues: response.issues.map((i: any) => this.mapIssue(i)),
      total: response.total,
      startAt: response.startAt,
      maxResults: response.maxResults,
    };
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const fields: Record<string, any> = {
      project: { key: input.projectKey },
      summary: input.title,
      issuetype: { name: input.issueType || 'Task' },
    };

    if (input.description) {
      fields.description = textToAdf(input.description);
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    if (input.labels && input.labels.length > 0) {
      fields.labels = input.labels;
    }

    if (input.assignee) {
      fields.assignee = this.isCloud
        ? { accountId: input.assignee }
        : { name: input.assignee };
    }

    // Add custom fields
    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    const response = await this.request('/rest/api/3/issue', {
      method: 'POST',
      body: { fields },
    });

    // Fetch full issue to return complete data
    return this.getIssue(response.key);
  }

  async updateIssue(issueKey: string, input: UpdateIssueInput): Promise<Issue> {
    const fields: Record<string, any> = {};

    if (input.title) {
      fields.summary = input.title;
    }

    if (input.description !== undefined) {
      fields.description = input.description
        ? textToAdf(input.description)
        : null;
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    if (input.labels) {
      fields.labels = input.labels;
    }

    if (input.assignee !== undefined) {
      fields.assignee = input.assignee
        ? this.isCloud
          ? { accountId: input.assignee }
          : { name: input.assignee }
        : null;
    }

    // Add custom fields
    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    await this.request(`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      body: { fields },
    });

    return this.getIssue(issueKey);
  }

  async addComment(issueKey: string, comment: string): Promise<IssueComment> {
    const response = await this.request(
      `/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        body: {
          body: textToAdf(comment),
        },
      },
    );

    return {
      id: response.id,
      author: response.author?.displayName || 'Unknown',
      body: adfToText(response.body),
      createdAt: response.created,
      updatedAt: response.updated,
    };
  }

  async getTransitions(issueKey: string): Promise<IssueTransition[]> {
    const response = await this.request(
      `/rest/api/3/issue/${issueKey}/transitions`,
    );

    return response.transitions.map((t: any) => ({
      id: t.id,
      name: t.name,
      to: {
        id: t.to.id,
        name: t.to.name,
        statusCategory: t.to.statusCategory?.key || 'undefined',
      },
    }));
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: {
        transition: { id: transitionId },
      },
    });

    this.logger.log(
      `Issue ${issueKey} transitioned with transition ${transitionId}`,
    );
  }

  async deleteIssue(issueKey: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE',
    });

    this.logger.log(`Issue ${issueKey} deleted`);
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

    this.logger.debug(`JIRA API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
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
      let errorMessage = `JIRA API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.errorMessages) {
          errorMessage = errorJson.errorMessages.join(', ');
        } else if (errorJson.errors) {
          errorMessage = Object.values(errorJson.errors).join(', ');
        }
      } catch {
        // Use default error message
      }

      this.logger.error(`JIRA API Error: ${errorMessage}`, errorBody);
      throw new Error(errorMessage);
    }

    // Handle empty responses (like DELETE)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  }

  private mapIssue(data: any): Issue {
    const fields = data.fields;

    // Map status category
    let statusCategory: 'todo' | 'in_progress' | 'done' = 'todo';
    const categoryKey = fields.status?.statusCategory?.key;
    if (categoryKey === 'indeterminate') {
      statusCategory = 'in_progress';
    } else if (categoryKey === 'done') {
      statusCategory = 'done';
    }

    return {
      id: data.id,
      key: data.key,
      title: fields.summary,
      description: fields.description
        ? adfToText(fields.description)
        : null,
      status: fields.status?.name || 'Unknown',
      statusCategory,
      priority: fields.priority?.name,
      issueType: fields.issuetype?.name || 'Task',
      labels: fields.labels || [],
      assignee: fields.assignee?.displayName || null,
      reporter: fields.reporter?.displayName || null,
      url: `${this.baseUrl}/browse/${data.key}`,
      createdAt: fields.created,
      updatedAt: fields.updated,
      comments: fields.comment?.comments?.map((c: any) => ({
        id: c.id,
        author: c.author?.displayName || 'Unknown',
        body: adfToText(c.body),
        createdAt: c.created,
        updatedAt: c.updated,
      })),
    };
  }
}

/**
 * Factory function to create JIRA adapter from integration config
 */
export function createJiraAdapter(config: {
  baseUrl: string;
  email?: string;
  apiToken: string;
  isCloud?: boolean;
}): IssueTrackerPort {
  return new JiraAdapter(config);
}
