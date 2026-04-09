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
 * Trello REST API Adapter
 *
 * Maps Trello concepts to the IssueTracker port:
 * - Board → Project
 * - Card → Issue
 * - List → Status / Transition
 * - Card comment → IssueComment
 *
 * Authentication: API Key + Token (query params)
 *
 * @see https://developer.atlassian.com/cloud/trello/rest/
 */
export class TrelloAdapter implements IssueTrackerPort {
  private readonly logger = new Logger(TrelloAdapter.name);
  private readonly apiKey: string;
  private readonly apiToken: string;
  private readonly baseApiUrl = 'https://api.trello.com/1';

  constructor(config: { apiKey: string; apiToken: string }) {
    this.apiKey = config.apiKey;
    this.apiToken = config.apiToken;
  }

  getProviderType(): 'trello' {
    return 'trello';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('/members/me');
      if (response.id) {
        this.logger.log(
          `Trello connection successful for user: ${response.fullName || response.username}`,
        );
        return { success: true };
      }
      return { success: false, error: 'Invalid response from Trello' };
    } catch (error) {
      this.logger.error(`Trello connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getProjects(): Promise<Project[]> {
    const boards = await this.request(
      '/members/me/boards?fields=id,name,desc,shortUrl,closed',
    );

    return boards
      .filter((b: any) => !b.closed)
      .map((b: any) => ({
        id: b.id,
        key: b.id,
        name: b.name,
        description: b.desc || undefined,
        url: b.shortUrl || `https://trello.com/b/${b.id}`,
      }));
  }

  async getIssue(cardId: string): Promise<Issue> {
    const card = await this.request(
      `/cards/${cardId}?fields=id,name,desc,idBoard,idList,labels,due,dateLastActivity,shortUrl,closed,idMembers&members=true&board=true&list=true`,
    );

    return this.mapCard(card);
  }

  /**
   * Get raw card data from Trello (for importing with full metadata)
   */
  async getRawCard(cardId: string): Promise<{
    issue: Issue;
    raw: Record<string, unknown>;
  }> {
    const card = await this.request(
      `/cards/${cardId}?fields=all&members=true&board=true&list=true&checklists=all&attachments=true`,
    );

    const raw: Record<string, unknown> = {
      id: card.id,
      name: card.name,
      desc: card.desc,
      closed: card.closed,
      idBoard: card.idBoard,
      idList: card.idList,
      board: card.board
        ? { id: card.board.id, name: card.board.name }
        : null,
      list: card.list ? { id: card.list.id, name: card.list.name } : null,
      labels: (card.labels || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      members: (card.members || []).map((m: any) => ({
        id: m.id,
        fullName: m.fullName,
        username: m.username,
      })),
      due: card.due,
      dueComplete: card.dueComplete,
      checklists: (card.checklists || []).map((cl: any) => ({
        id: cl.id,
        name: cl.name,
        checkItems: (cl.checkItems || []).map((ci: any) => ({
          id: ci.id,
          name: ci.name,
          state: ci.state,
        })),
      })),
      attachments: (card.attachments || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        url: a.url,
      })),
      url: card.shortUrl || `https://trello.com/c/${card.id}`,
      dateLastActivity: card.dateLastActivity,
    };

    return {
      issue: this.mapCard(card),
      raw,
    };
  }

  async searchIssues(input: SearchIssuesInput): Promise<SearchResult> {
    const maxResults = input.maxResults || 50;

    // Build Trello search query
    let query = input.jql || '';

    if (!query) {
      const parts: string[] = [];

      if (input.projectKey) {
        parts.push(`board:${input.projectKey}`);
      }

      if (input.labels && input.labels.length > 0) {
        for (const label of input.labels) {
          parts.push(`label:${label}`);
        }
      }

      if (input.assignee && input.assignee !== 'unassigned') {
        parts.push(`@${input.assignee}`);
      }

      query = parts.join(' ') || '*';
    }

    const params = new URLSearchParams({
      query,
      modelTypes: 'cards',
      cards_limit: String(maxResults),
      card_fields:
        'id,name,desc,idBoard,idList,labels,due,dateLastActivity,shortUrl,closed,idMembers',
      card_members: 'true',
      card_board: 'true',
      card_list: 'true',
    });

    const response = await this.request(`/search?${params}`);

    const cards = response.cards || [];

    // Filter by status (list name) if specified
    let filteredCards = cards;
    if (input.status) {
      const statuses = Array.isArray(input.status)
        ? input.status.map((s) => s.toLowerCase())
        : [input.status.toLowerCase()];
      filteredCards = cards.filter(
        (c: any) =>
          c.list && statuses.includes(c.list.name?.toLowerCase()),
      );
    }

    return {
      issues: filteredCards.map((c: any) => this.mapCard(c)),
      total: filteredCards.length,
      startAt: 0,
      maxResults,
    };
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    // projectKey is used as boardId for Trello
    // We need to find the first list on the board to place the card
    const lists = await this.request(
      `/boards/${input.projectKey}/lists?fields=id,name&filter=open`,
    );

    if (!lists || lists.length === 0) {
      throw new Error(
        `No open lists found on board ${input.projectKey}`,
      );
    }

    // Use the first list by default
    const targetList = lists[0];

    const body: Record<string, string> = {
      name: input.title,
      idList: targetList.id,
    };

    if (input.description) {
      body.desc = input.description;
    }

    if (input.labels && input.labels.length > 0) {
      body.idLabels = input.labels.join(',');
    }

    if (input.assignee) {
      body.idMembers = input.assignee;
    }

    const card = await this.request('/cards', {
      method: 'POST',
      body,
    });

    return this.getIssue(card.id);
  }

  async updateIssue(cardId: string, input: UpdateIssueInput): Promise<Issue> {
    const body: Record<string, string> = {};

    if (input.title) {
      body.name = input.title;
    }

    if (input.description !== undefined) {
      body.desc = input.description || '';
    }

    if (input.labels) {
      body.idLabels = input.labels.join(',');
    }

    if (input.assignee !== undefined) {
      body.idMembers = input.assignee || '';
    }

    await this.request(`/cards/${cardId}`, {
      method: 'PUT',
      body,
    });

    return this.getIssue(cardId);
  }

  async addComment(cardId: string, comment: string): Promise<IssueComment> {
    const response = await this.request(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      body: { text: comment },
    });

    return {
      id: response.id,
      author:
        response.memberCreator?.fullName ||
        response.memberCreator?.username ||
        'Unknown',
      body: response.data?.text || comment,
      createdAt: response.date,
      updatedAt: response.date,
    };
  }

  async getTransitions(cardId: string): Promise<IssueTransition[]> {
    // Get the board ID from the card
    const card = await this.request(`/cards/${cardId}?fields=idBoard`);

    // Get all open lists on the board - each list is a potential transition target
    const lists = await this.request(
      `/boards/${card.idBoard}/lists?fields=id,name&filter=open`,
    );

    return lists.map((list: any) => ({
      id: list.id,
      name: list.name,
      to: {
        id: list.id,
        name: list.name,
        statusCategory: this.inferStatusCategory(list.name),
      },
    }));
  }

  async transitionIssue(cardId: string, listId: string): Promise<void> {
    await this.request(`/cards/${cardId}`, {
      method: 'PUT',
      body: { idList: listId },
    });

    this.logger.log(`Card ${cardId} moved to list ${listId}`);
  }

  async deleteIssue(cardId: string): Promise<void> {
    await this.request(`/cards/${cardId}`, {
      method: 'DELETE',
    });

    this.logger.log(`Card ${cardId} deleted`);
  }

  // Private helper methods

  private async request(
    path: string,
    options: {
      method?: string;
      body?: any;
    } = {},
  ): Promise<any> {
    const method = options.method || 'GET';
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseApiUrl}${path}${separator}key=${this.apiKey}&token=${this.apiToken}`;

    this.logger.debug(`Trello API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    let bodyStr: string | undefined;
    if (options.body) {
      headers['Content-Type'] = 'application/json';
      bodyStr = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMessage = `Trello API error: ${response.status} ${response.statusText} - ${errorBody}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  }

  private mapCard(card: any): Issue {
    const listName = card.list?.name || 'Unknown';
    const statusCategory = this.inferStatusCategory(listName);

    const memberNames = (card.members || [])
      .map((m: any) => m.fullName || m.username)
      .filter(Boolean);

    const labels = (card.labels || [])
      .map((l: any) => l.name || l.color)
      .filter(Boolean);

    // Trello card IDs are 24-char hex strings; use shortLink if available
    const key = card.shortLink || card.id;

    return {
      id: card.id,
      key,
      title: card.name,
      description: card.desc || null,
      status: listName,
      statusCategory,
      issueType: 'Card',
      labels,
      assignee: memberNames.length > 0 ? memberNames.join(', ') : null,
      url: card.shortUrl || `https://trello.com/c/${card.id}`,
      createdAt: card.dateLastActivity || new Date().toISOString(),
      updatedAt: card.dateLastActivity || new Date().toISOString(),
    };
  }

  /**
   * Infer status category from Trello list name using common conventions
   */
  private inferStatusCategory(
    listName: string,
  ): 'todo' | 'in_progress' | 'done' {
    const name = listName.toLowerCase();

    if (
      name.includes('done') ||
      name.includes('complete') ||
      name.includes('finished') ||
      name.includes('closed') ||
      name.includes('resolved')
    ) {
      return 'done';
    }

    if (
      name.includes('progress') ||
      name.includes('doing') ||
      name.includes('review') ||
      name.includes('testing') ||
      name.includes('active')
    ) {
      return 'in_progress';
    }

    return 'todo';
  }
}

/**
 * Factory function to create Trello adapter from integration config
 */
export function createTrelloAdapter(config: {
  apiKey: string;
  apiToken: string;
}): IssueTrackerPort {
  return new TrelloAdapter(config);
}
