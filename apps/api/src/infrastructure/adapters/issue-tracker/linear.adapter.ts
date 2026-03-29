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
 * Linear GraphQL API Adapter
 *
 * Linear uses GraphQL for their API. This adapter implements the IssueTrackerPort
 * interface using Linear's GraphQL endpoint.
 *
 * Authentication:
 * - API Key (Authorization: <API_KEY>)
 * - OAuth2 Bearer Token (Authorization: Bearer <TOKEN>)
 *
 * @see https://developers.linear.app/docs/graphql/working-with-the-graphql-api
 */
export class LinearAdapter implements IssueTrackerPort {
  private readonly logger = new Logger(LinearAdapter.name);
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.linear.app/graphql';

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  getProviderType(): 'linear' {
    return 'linear';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `
        query {
          viewer {
            id
            name
            email
          }
        }
      `;

      const response = await this.graphql(query);
      if (response.viewer?.id) {
        this.logger.log(
          `Linear connection successful for user: ${response.viewer.name}`,
        );
        return { success: true };
      }
      return { success: false, error: 'Invalid response from Linear' };
    } catch (error) {
      this.logger.error(`Linear connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getProjects(): Promise<Project[]> {
    const query = `
      query {
        teams {
          nodes {
            id
            key
            name
            description
          }
        }
      }
    `;

    const response = await this.graphql(query);

    return response.teams.nodes.map((team: any) => ({
      id: team.id,
      key: team.key,
      name: team.name,
      description: team.description,
      url: `https://linear.app/team/${team.key}`,
    }));
  }

  async getIssue(issueKey: string): Promise<Issue> {
    // Linear uses issue identifiers like "ENG-123"
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          state {
            id
            name
            type
          }
          priority
          labels {
            nodes {
              id
              name
            }
          }
          assignee {
            id
            name
            email
          }
          creator {
            id
            name
          }
          createdAt
          updatedAt
          url
          comments {
            nodes {
              id
              body
              user {
                name
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const response = await this.graphql(query, { identifier: issueKey });

    if (!response.issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    return this.mapIssue(response.issue);
  }

  /**
   * Get raw issue data from Linear (for importing with full metadata)
   */
  async getRawIssue(issueKey: string): Promise<{
    issue: Issue;
    raw: Record<string, unknown>;
  }> {
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          state {
            id
            name
            type
            color
          }
          priority
          priorityLabel
          estimate
          labels {
            nodes {
              id
              name
              color
            }
          }
          assignee {
            id
            name
            email
          }
          creator {
            id
            name
            email
          }
          team {
            id
            key
            name
          }
          project {
            id
            name
          }
          cycle {
            id
            name
            number
          }
          parent {
            id
            identifier
            title
          }
          children {
            nodes {
              id
              identifier
              title
              state {
                name
              }
            }
          }
          createdAt
          updatedAt
          completedAt
          canceledAt
          dueDate
          url
          comments {
            nodes {
              id
              body
              user {
                name
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const response = await this.graphql(query, { identifier: issueKey });

    if (!response.issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    const issue = response.issue;

    const raw: Record<string, unknown> = {
      id: issue.id,
      key: issue.identifier,
      title: issue.title,
      description: issue.description,
      state: {
        id: issue.state?.id,
        name: issue.state?.name,
        type: issue.state?.type,
        color: issue.state?.color,
      },
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      estimate: issue.estimate,
      labels: issue.labels?.nodes?.map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
          }
        : null,
      creator: issue.creator
        ? {
            id: issue.creator.id,
            name: issue.creator.name,
            email: issue.creator.email,
          }
        : null,
      team: issue.team
        ? {
            id: issue.team.id,
            key: issue.team.key,
            name: issue.team.name,
          }
        : null,
      project: issue.project
        ? {
            id: issue.project.id,
            name: issue.project.name,
          }
        : null,
      cycle: issue.cycle
        ? {
            id: issue.cycle.id,
            name: issue.cycle.name,
            number: issue.cycle.number,
          }
        : null,
      parent: issue.parent
        ? {
            id: issue.parent.id,
            key: issue.parent.identifier,
            title: issue.parent.title,
          }
        : null,
      children: issue.children?.nodes?.map((c: any) => ({
        id: c.id,
        key: c.identifier,
        title: c.title,
        status: c.state?.name,
      })),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      completedAt: issue.completedAt,
      canceledAt: issue.canceledAt,
      dueDate: issue.dueDate,
      url: issue.url,
    };

    return {
      issue: this.mapIssue(issue),
      raw,
    };
  }

  async searchIssues(input: SearchIssuesInput): Promise<SearchResult> {
    // Build filter
    const filter: Record<string, any> = {};

    if (input.projectKey) {
      filter.team = { key: { eq: input.projectKey } };
    }

    if (input.status) {
      const statuses = Array.isArray(input.status)
        ? input.status
        : [input.status];
      filter.state = { name: { in: statuses } };
    }

    if (input.assignee) {
      if (input.assignee === 'unassigned') {
        filter.assignee = { null: true };
      } else {
        filter.assignee = { name: { containsIgnoreCase: input.assignee } };
      }
    }

    if (input.labels && input.labels.length > 0) {
      filter.labels = { some: { name: { in: input.labels } } };
    }

    const query = `
      query SearchIssues($filter: IssueFilter, $first: Int, $after: String) {
        issues(filter: $filter, first: $first, after: $after) {
          nodes {
            id
            identifier
            title
            description
            state {
              id
              name
              type
            }
            priority
            labels {
              nodes {
                id
                name
              }
            }
            assignee {
              name
            }
            creator {
              name
            }
            createdAt
            updatedAt
            url
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await this.graphql(query, {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      first: input.maxResults || 50,
    });

    return {
      issues: response.issues.nodes.map((i: any) => this.mapIssue(i)),
      total: response.issues.nodes.length, // Linear doesn't provide total count easily
      startAt: input.startAt || 0,
      maxResults: input.maxResults || 50,
    };
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    // First, get the team ID from the project key
    const teamQuery = `
      query GetTeam($key: String!) {
        team(id: $key) {
          id
        }
      }
    `;

    let teamId: string;
    try {
      const teamResponse = await this.graphql(teamQuery, {
        key: input.projectKey,
      });
      teamId = teamResponse.team?.id;
    } catch {
      // Try to find team by key
      const teamsQuery = `
        query {
          teams {
            nodes {
              id
              key
            }
          }
        }
      `;
      const teamsResponse = await this.graphql(teamsQuery);
      const team = teamsResponse.teams.nodes.find(
        (t: any) => t.key === input.projectKey,
      );
      if (!team) {
        throw new Error(`Team with key ${input.projectKey} not found`);
      }
      teamId = team.id;
    }

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            state {
              id
              name
              type
            }
            priority
            labels {
              nodes {
                id
                name
              }
            }
            assignee {
              name
            }
            creator {
              name
            }
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    const issueInput: Record<string, any> = {
      teamId,
      title: input.title,
    };

    if (input.description) {
      issueInput.description = input.description;
    }

    if (input.priority) {
      // Linear priorities: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
      const priorityMap: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
      };
      issueInput.priority = priorityMap[input.priority.toLowerCase()] || 0;
    }

    if (input.labels && input.labels.length > 0) {
      // Need to get label IDs first
      const labelsQuery = `
        query GetLabels($teamId: String!) {
          team(id: $teamId) {
            labels {
              nodes {
                id
                name
              }
            }
          }
        }
      `;
      const labelsResponse = await this.graphql(labelsQuery, { teamId });
      const labelIds = labelsResponse.team.labels.nodes
        .filter((l: any) => input.labels!.includes(l.name))
        .map((l: any) => l.id);

      if (labelIds.length > 0) {
        issueInput.labelIds = labelIds;
      }
    }

    if (input.assignee) {
      issueInput.assigneeId = input.assignee;
    }

    const response = await this.graphql(mutation, { input: issueInput });

    if (!response.issueCreate.success) {
      throw new Error('Failed to create issue in Linear');
    }

    return this.mapIssue(response.issueCreate.issue);
  }

  async updateIssue(issueKey: string, input: UpdateIssueInput): Promise<Issue> {
    // First get the issue ID from the identifier
    const issue = await this.getIssueId(issueKey);

    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            state {
              id
              name
              type
            }
            priority
            labels {
              nodes {
                id
                name
              }
            }
            assignee {
              name
            }
            creator {
              name
            }
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    const issueInput: Record<string, any> = {};

    if (input.title) {
      issueInput.title = input.title;
    }

    if (input.description !== undefined) {
      issueInput.description = input.description;
    }

    if (input.priority) {
      const priorityMap: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
      };
      issueInput.priority = priorityMap[input.priority.toLowerCase()] || 0;
    }

    if (input.assignee !== undefined) {
      issueInput.assigneeId = input.assignee || null;
    }

    const response = await this.graphql(mutation, {
      id: issue.id,
      input: issueInput,
    });

    if (!response.issueUpdate.success) {
      throw new Error('Failed to update issue in Linear');
    }

    return this.mapIssue(response.issueUpdate.issue);
  }

  async addComment(issueKey: string, comment: string): Promise<IssueComment> {
    const issue = await this.getIssueId(issueKey);

    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            user {
              name
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

    const response = await this.graphql(mutation, {
      input: {
        issueId: issue.id,
        body: comment,
      },
    });

    if (!response.commentCreate.success) {
      throw new Error('Failed to add comment in Linear');
    }

    const c = response.commentCreate.comment;
    return {
      id: c.id,
      author: c.user?.name || 'Unknown',
      body: c.body,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async getTransitions(issueKey: string): Promise<IssueTransition[]> {
    // First get the issue to find its team
    const issueQuery = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          team {
            id
            states {
              nodes {
                id
                name
                type
              }
            }
          }
        }
      }
    `;

    const response = await this.graphql(issueQuery, { identifier: issueKey });

    if (!response.issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    // Map Linear state types to our status categories
    const typeToCategory: Record<string, string> = {
      backlog: 'todo',
      unstarted: 'todo',
      started: 'in_progress',
      completed: 'done',
      canceled: 'done',
    };

    return response.issue.team.states.nodes.map((state: any) => ({
      id: state.id,
      name: state.name,
      to: {
        id: state.id,
        name: state.name,
        statusCategory: typeToCategory[state.type] || 'todo',
      },
    }));
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const issue = await this.getIssueId(issueKey);

    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    const response = await this.graphql(mutation, {
      id: issue.id,
      input: { stateId: transitionId },
    });

    if (!response.issueUpdate.success) {
      throw new Error('Failed to transition issue in Linear');
    }

    this.logger.log(`Issue ${issueKey} transitioned to state ${transitionId}`);
  }

  async deleteIssue(issueKey: string): Promise<void> {
    const issue = await this.getIssueId(issueKey);

    const mutation = `
      mutation DeleteIssue($id: String!) {
        issueDelete(id: $id) {
          success
        }
      }
    `;

    const response = await this.graphql(mutation, { id: issue.id });

    if (!response.issueDelete.success) {
      throw new Error('Failed to delete issue in Linear');
    }

    this.logger.log(`Issue ${issueKey} deleted`);
  }

  // Private helper methods

  private async getIssueId(
    issueKey: string,
  ): Promise<{ id: string; identifier: string }> {
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
        }
      }
    `;

    const response = await this.graphql(query, { identifier: issueKey });

    if (!response.issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    return { id: response.issue.id, identifier: response.issue.identifier };
  }

  private async graphql(
    query: string,
    variables?: Record<string, any>,
  ): Promise<any> {
    this.logger.debug(`Linear GraphQL Request`);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Linear API Error: ${response.status}`, errorBody);
      throw new Error(
        `Linear API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      const errorMessage = json.errors.map((e: any) => e.message).join(', ');
      this.logger.error(`Linear GraphQL Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return json.data;
  }

  private mapIssue(data: any): Issue {
    // Map Linear state type to our status category
    let statusCategory: 'todo' | 'in_progress' | 'done' = 'todo';
    const stateType = data.state?.type;
    if (stateType === 'started') {
      statusCategory = 'in_progress';
    } else if (stateType === 'completed' || stateType === 'canceled') {
      statusCategory = 'done';
    }

    // Map priority number to label
    const priorityLabels: Record<number, string> = {
      0: 'No priority',
      1: 'Urgent',
      2: 'High',
      3: 'Medium',
      4: 'Low',
    };

    return {
      id: data.id,
      key: data.identifier,
      title: data.title,
      description: data.description || null,
      status: data.state?.name || 'Unknown',
      statusCategory,
      priority: priorityLabels[data.priority] || undefined,
      issueType: 'Issue', // Linear doesn't have issue types like Jira
      labels: data.labels?.nodes?.map((l: any) => l.name) || [],
      assignee: data.assignee?.name || null,
      reporter: data.creator?.name || null,
      url: data.url,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      comments: data.comments?.nodes?.map((c: any) => ({
        id: c.id,
        author: c.user?.name || 'Unknown',
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }
}

/**
 * Factory function to create Linear adapter from integration config
 */
export function createLinearAdapter(config: {
  apiKey: string;
}): IssueTrackerPort {
  return new LinearAdapter(config);
}
