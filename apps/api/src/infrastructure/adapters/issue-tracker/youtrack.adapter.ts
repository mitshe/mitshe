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

/**
 * YouTrack REST API Adapter
 *
 * Supports YouTrack Cloud and InCloud (Server)
 *
 * Authentication:
 * - Permanent Token (Bearer Token)
 *
 * @see https://www.jetbrains.com/help/youtrack/devportal/api-concept.html
 * @see https://www.jetbrains.com/help/youtrack/devportal/resource-api-issues.html
 */
export class YouTrackAdapter implements IssueTrackerPort {
  private readonly logger = new Logger(YouTrackAdapter.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: {
    baseUrl: string; // e.g., https://yourcompany.youtrack.cloud or https://youtrack.yourcompany.com
    permanentToken: string; // Permanent token from Profile > Account Security
  }) {
    // Normalize base URL - remove trailing slashes
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.authHeader = `Bearer ${config.permanentToken}`;
  }

  getProviderType(): 'youtrack' {
    return 'youtrack';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test by getting current user info
      const response = await this.request(
        '/api/users/me?fields=id,login,name,email',
      );
      if (response.id || response.login) {
        this.logger.log(
          `YouTrack connection successful for user: ${response.name || response.login}`,
        );
        return { success: true };
      }
      return { success: false, error: 'Invalid response from YouTrack' };
    } catch (error) {
      this.logger.error(`YouTrack connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.request(
      '/api/admin/projects?fields=id,shortName,name,description&$top=100',
    );

    return response.map((p: any) => ({
      id: p.id,
      key: p.shortName,
      name: p.name,
      description: p.description,
      url: `${this.baseUrl}/projects/${p.shortName}`,
    }));
  }

  async getIssue(issueKey: string): Promise<Issue> {
    const fields = [
      'id',
      'idReadable',
      'summary',
      'description',
      'created',
      'updated',
      'resolved',
      'reporter(id,login,name)',
      'updater(id,login,name)',
      'project(id,shortName,name)',
      'customFields(id,name,value(id,name,login,text,minutes,presentation))',
      'tags(id,name)',
      'comments(id,author(id,login,name),text,created,updated)',
    ].join(',');

    const response = await this.request(
      `/api/issues/${issueKey}?fields=${fields}`,
    );
    return this.mapIssue(response);
  }

  /**
   * Get raw issue data from YouTrack (for importing with full metadata)
   */
  async getRawIssue(issueKey: string): Promise<{
    issue: Issue;
    raw: Record<string, unknown>;
  }> {
    const fields = [
      'id',
      'idReadable',
      'summary',
      'description',
      'created',
      'updated',
      'resolved',
      'reporter(id,login,name,email)',
      'updater(id,login,name,email)',
      'project(id,shortName,name)',
      'customFields(id,name,value(id,name,login,text,minutes,presentation,color(id,background)))',
      'tags(id,name,color(id,background))',
      'links(id,linkType(name,sourceToTarget,targetToSource),direction,issues(id,idReadable,summary))',
      'comments(id,author(id,login,name),text,created,updated)',
      'attachments(id,name,url,size,mimeType)',
    ].join(',');

    const response = await this.request(
      `/api/issues/${issueKey}?fields=${fields}`,
    );

    // Build raw object with all useful data
    const raw: Record<string, unknown> = {
      id: response.id,
      key: response.idReadable,
      summary: response.summary,
      description: response.description,
      project: {
        id: response.project?.id,
        key: response.project?.shortName,
        name: response.project?.name,
      },
      reporter: response.reporter
        ? {
            id: response.reporter.id,
            login: response.reporter.login,
            name: response.reporter.name,
            email: response.reporter.email,
          }
        : null,
      updater: response.updater
        ? {
            id: response.updater.id,
            login: response.updater.login,
            name: response.updater.name,
          }
        : null,
      tags: (response.tags || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color?.background,
      })),
      customFields: this.extractCustomFields(response.customFields || []),
      links: this.extractLinks(response.links || []),
      attachments: (response.attachments || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
        mimeType: a.mimeType,
      })),
      created: response.created,
      updated: response.updated,
      resolved: response.resolved,
      url: `${this.baseUrl}/issue/${response.idReadable}`,
    };

    return {
      issue: this.mapIssue(response),
      raw,
    };
  }

  /**
   * Extract custom fields into a more usable format
   */
  private extractCustomFields(customFields: any[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const field of customFields) {
      const name = field.name;
      const value = field.value;

      if (value === null || value === undefined) {
        result[name] = null;
        continue;
      }

      // Handle different value types
      if (Array.isArray(value)) {
        result[name] = value.map((v: any) => this.extractFieldValue(v));
      } else {
        result[name] = this.extractFieldValue(value);
      }
    }

    return result;
  }

  /**
   * Extract a single field value
   */
  private extractFieldValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // User/Assignee field
    if (value.login !== undefined) {
      return {
        id: value.id,
        login: value.login,
        name: value.name,
      };
    }

    // Enum/State value
    if (value.name !== undefined) {
      return value.name;
    }

    // Period (time tracking)
    if (value.minutes !== undefined) {
      return {
        minutes: value.minutes,
        presentation: value.presentation,
      };
    }

    // Text field
    if (value.text !== undefined) {
      return value.text;
    }

    // Date field
    if (typeof value === 'number') {
      return value;
    }

    return value;
  }

  /**
   * Extract issue links
   */
  private extractLinks(links: any[]): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    for (const link of links) {
      const linkType = link.linkType?.name || 'unknown';
      const direction = link.direction;
      const key =
        direction === 'OUTWARD'
          ? link.linkType?.sourceToTarget || linkType
          : link.linkType?.targetToSource || linkType;

      if (!result[key]) {
        result[key] = [];
      }

      for (const issue of link.issues || []) {
        result[key].push({
          id: issue.id,
          key: issue.idReadable,
          summary: issue.summary,
        });
      }
    }

    return result;
  }

  async searchIssues(input: SearchIssuesInput): Promise<SearchResult> {
    // YouTrack uses its own query language
    let query = input.jql || '';

    if (!query) {
      const conditions: string[] = [];

      if (input.projectKey) {
        conditions.push(`project: {${input.projectKey}}`);
      }

      if (input.status) {
        const statuses = Array.isArray(input.status)
          ? input.status
          : [input.status];
        conditions.push(`State: ${statuses.join(', ')}`);
      }

      if (input.assignee) {
        if (input.assignee === 'unassigned') {
          conditions.push('Assignee: Unassigned');
        } else {
          conditions.push(`Assignee: {${input.assignee}}`);
        }
      }

      if (input.labels && input.labels.length > 0) {
        conditions.push(`tag: ${input.labels.join(', ')}`);
      }

      query = conditions.join(' ');
    }

    const maxResults = input.maxResults || 50;
    const skip = input.startAt || 0;

    const fields = [
      'id',
      'idReadable',
      'summary',
      'description',
      'created',
      'updated',
      'resolved',
      'reporter(id,login,name)',
      'project(id,shortName,name)',
      'customFields(id,name,value(id,name,login,text))',
      'tags(id,name)',
    ].join(',');

    const params = new URLSearchParams({
      fields,
      query: query || '',
      $top: String(maxResults),
      $skip: String(skip),
    });

    const response = await this.request(`/api/issues?${params}`);

    // YouTrack doesn't return total count in search results by default
    // We estimate based on results returned
    const issues = Array.isArray(response) ? response : [];

    return {
      issues: issues.map((i: any) => this.mapIssue(i)),
      total:
        issues.length < maxResults
          ? skip + issues.length
          : skip + maxResults + 1,
      startAt: skip,
      maxResults,
    };
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const body: Record<string, any> = {
      project: { id: input.projectKey },
      summary: input.title,
    };

    if (input.description) {
      body.description = input.description;
    }

    // Handle custom fields
    const customFields: any[] = [];

    if (input.issueType) {
      customFields.push({
        name: 'Type',
        $type: 'SingleEnumIssueCustomField',
        value: { name: input.issueType },
      });
    }

    if (input.priority) {
      customFields.push({
        name: 'Priority',
        $type: 'SingleEnumIssueCustomField',
        value: { name: input.priority },
      });
    }

    if (input.assignee) {
      customFields.push({
        name: 'Assignee',
        $type: 'SingleUserIssueCustomField',
        value: { login: input.assignee },
      });
    }

    if (customFields.length > 0) {
      body.customFields = customFields;
    }

    const response = await this.request('/api/issues?fields=id,idReadable', {
      method: 'POST',
      body,
    });

    // Add tags separately if needed
    if (input.labels && input.labels.length > 0) {
      for (const label of input.labels) {
        try {
          await this.request(`/api/issues/${response.idReadable}/tags`, {
            method: 'POST',
            body: { name: label },
          });
        } catch (error) {
          this.logger.warn(`Failed to add tag ${label}: ${error.message}`);
        }
      }
    }

    // Fetch full issue to return complete data
    return this.getIssue(response.idReadable);
  }

  async updateIssue(issueKey: string, input: UpdateIssueInput): Promise<Issue> {
    const body: Record<string, any> = {};

    if (input.title) {
      body.summary = input.title;
    }

    if (input.description !== undefined) {
      body.description = input.description;
    }

    // Handle custom fields
    const customFields: any[] = [];

    if (input.priority) {
      customFields.push({
        name: 'Priority',
        $type: 'SingleEnumIssueCustomField',
        value: { name: input.priority },
      });
    }

    if (input.assignee !== undefined) {
      customFields.push({
        name: 'Assignee',
        $type: 'SingleUserIssueCustomField',
        value: input.assignee ? { login: input.assignee } : null,
      });
    }

    if (customFields.length > 0) {
      body.customFields = customFields;
    }

    // Only make request if there are changes
    if (Object.keys(body).length > 0) {
      await this.request(`/api/issues/${issueKey}`, {
        method: 'POST',
        body,
      });
    }

    // Handle tags separately
    if (input.labels !== undefined) {
      // Get current tags
      const issue = await this.request(
        `/api/issues/${issueKey}?fields=tags(id,name)`,
      );
      const currentTags = (issue.tags || []).map((t: any) => t.name);

      // Remove old tags
      for (const tag of currentTags) {
        if (!input.labels.includes(tag)) {
          try {
            await this.request(
              `/api/issues/${issueKey}/tags/${encodeURIComponent(tag)}`,
              { method: 'DELETE' },
            );
          } catch (error) {
            this.logger.warn(`Failed to remove tag ${tag}: ${error.message}`);
          }
        }
      }

      // Add new tags
      for (const label of input.labels) {
        if (!currentTags.includes(label)) {
          try {
            await this.request(`/api/issues/${issueKey}/tags`, {
              method: 'POST',
              body: { name: label },
            });
          } catch (error) {
            this.logger.warn(`Failed to add tag ${label}: ${error.message}`);
          }
        }
      }
    }

    return this.getIssue(issueKey);
  }

  async addComment(issueKey: string, comment: string): Promise<IssueComment> {
    const response = await this.request(
      `/api/issues/${issueKey}/comments?fields=id,author(id,login,name),text,created,updated`,
      {
        method: 'POST',
        body: {
          text: comment,
        },
      },
    );

    return {
      id: response.id,
      author: response.author?.name || response.author?.login || 'Unknown',
      body: response.text,
      createdAt: new Date(response.created).toISOString(),
      updatedAt: response.updated
        ? new Date(response.updated).toISOString()
        : undefined,
    };
  }

  async getTransitions(issueKey: string): Promise<IssueTransition[]> {
    // YouTrack doesn't have explicit transitions like JIRA
    // Instead, we get available state values from the State field
    const fields =
      'customFields(id,name,value(id,name),projectCustomField(field(fieldType(id)),bundle(values(id,name,isResolved))))';
    const response = await this.request(
      `/api/issues/${issueKey}?fields=${fields}`,
    );

    const stateField = (response.customFields || []).find(
      (f: any) => f.name === 'State',
    );

    if (!stateField?.projectCustomField?.bundle?.values) {
      return [];
    }

    const currentState = stateField.value?.name;
    const allStates = stateField.projectCustomField.bundle.values;

    // Return all states except current as available transitions
    return allStates
      .filter((s: any) => s.name !== currentState)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        to: {
          id: s.id,
          name: s.name,
          statusCategory: s.isResolved ? 'done' : 'new',
        },
      }));
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    // In YouTrack, we transition by updating the State custom field
    // transitionId here is the state name or ID
    await this.request(`/api/issues/${issueKey}`, {
      method: 'POST',
      body: {
        customFields: [
          {
            name: 'State',
            $type: 'StateIssueCustomField',
            value: { id: transitionId },
          },
        ],
      },
    });

    this.logger.log(`Issue ${issueKey} transitioned to state ${transitionId}`);
  }

  /**
   * Transition issue by state name (more user-friendly)
   */
  async transitionIssueByName(
    issueKey: string,
    stateName: string,
  ): Promise<void> {
    await this.request(`/api/issues/${issueKey}`, {
      method: 'POST',
      body: {
        customFields: [
          {
            name: 'State',
            $type: 'StateIssueCustomField',
            value: { name: stateName },
          },
        ],
      },
    });

    this.logger.log(`Issue ${issueKey} transitioned to state ${stateName}`);
  }

  async deleteIssue(issueKey: string): Promise<void> {
    await this.request(`/api/issues/${issueKey}`, {
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

    this.logger.debug(`YouTrack API Request: ${method} ${path}`);

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
      let errorMessage = `YouTrack API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error_description) {
          errorMessage = errorJson.error_description;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Use default error message
      }

      this.logger.error(`YouTrack API Error: ${errorMessage}`, errorBody);
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
    const customFields = data.customFields || [];

    // Extract common fields from custom fields
    const stateField = customFields.find((f: any) => f.name === 'State');
    const priorityField = customFields.find((f: any) => f.name === 'Priority');
    const typeField = customFields.find((f: any) => f.name === 'Type');
    const assigneeField = customFields.find((f: any) => f.name === 'Assignee');

    // Map status category
    let statusCategory: 'todo' | 'in_progress' | 'done' = 'todo';
    const stateName = stateField?.value?.name?.toLowerCase() || '';

    if (
      stateName.includes('progress') ||
      stateName.includes('review') ||
      stateName.includes('testing')
    ) {
      statusCategory = 'in_progress';
    } else if (
      stateName.includes('done') ||
      stateName.includes('complete') ||
      stateName.includes('fixed') ||
      stateName.includes('resolved') ||
      stateName.includes('closed')
    ) {
      statusCategory = 'done';
    }

    // Extract tags as labels
    const labels = (data.tags || []).map((t: any) => t.name);

    return {
      id: data.id,
      key: data.idReadable,
      title: data.summary,
      description: data.description || null,
      status: stateField?.value?.name || 'Unknown',
      statusCategory,
      priority: priorityField?.value?.name,
      issueType: typeField?.value?.name || 'Task',
      labels,
      assignee:
        assigneeField?.value?.name || assigneeField?.value?.login || null,
      reporter: data.reporter?.name || data.reporter?.login || null,
      url: `${this.baseUrl}/issue/${data.idReadable}`,
      createdAt: data.created
        ? new Date(data.created).toISOString()
        : new Date().toISOString(),
      updatedAt: data.updated
        ? new Date(data.updated).toISOString()
        : new Date().toISOString(),
      comments: (data.comments || []).map((c: any) => ({
        id: c.id,
        author: c.author?.name || c.author?.login || 'Unknown',
        body: c.text,
        createdAt: new Date(c.created).toISOString(),
        updatedAt: c.updated ? new Date(c.updated).toISOString() : undefined,
      })),
    };
  }
}

/**
 * Factory function to create YouTrack adapter from integration config
 */
export function createYouTrackAdapter(config: {
  baseUrl: string;
  permanentToken: string;
}): IssueTrackerPort {
  return new YouTrackAdapter(config);
}
