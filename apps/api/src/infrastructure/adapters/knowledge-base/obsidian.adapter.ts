import { Logger } from '@nestjs/common';
import * as https from 'https';
import {
  KnowledgeBasePort,
  KnowledgeBaseNote,
  KnowledgeBaseCommand,
  SearchNotesInput,
  SearchNotesResult,
  CreateNoteInput,
  UpdateNoteInput,
} from '../../../ports/knowledge-base.port';

/**
 * Obsidian Local REST API Adapter
 *
 * Connects to locally running Obsidian with the Local REST API plugin
 *
 * Plugin: https://github.com/coddingtonbear/obsidian-local-rest-api
 *
 * Requirements:
 * - Obsidian must be running
 * - Local REST API plugin must be installed and enabled
 * - API key must be configured in the plugin settings
 *
 * Default ports:
 * - HTTPS: 27124 (recommended)
 * - HTTP: 27123
 *
 * @see https://coddingtonbear.github.io/obsidian-local-rest-api/
 */
export class ObsidianAdapter implements KnowledgeBasePort {
  private readonly logger = new Logger(ObsidianAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly httpsAgent: https.Agent;

  constructor(config: {
    baseUrl?: string; // Default: https://127.0.0.1:27124
    apiKey: string; // From Obsidian Local REST API plugin settings
    insecure?: boolean; // Allow self-signed certificates (default: true for localhost)
  }) {
    this.baseUrl = (config.baseUrl || 'https://127.0.0.1:27124').replace(
      /\/+$/,
      '',
    );
    this.apiKey = config.apiKey;

    // Create HTTPS agent that allows self-signed certificates for localhost
    const isLocalhost =
      this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('localhost');
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: config.insecure === false ? true : !isLocalhost,
    });
  }

  getProviderType(): 'obsidian' {
    return 'obsidian';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test by getting the root vault endpoint
      const response = await this.request('/');

      // The root endpoint returns vault info
      if (response !== null) {
        this.logger.log('Obsidian connection successful');
        return { success: true };
      }

      return { success: false, error: 'Invalid response from Obsidian' };
    } catch (error) {
      this.logger.error(`Obsidian connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getNote(path: string): Promise<KnowledgeBaseNote> {
    // Normalize path
    const normalizedPath = this.normalizePath(path);

    const content = await this.request(
      `/vault/${encodeURIComponent(normalizedPath)}`,
      {
        returnRaw: true,
      },
    );

    return this.parseNote(normalizedPath, content);
  }

  async listNotes(folder?: string): Promise<KnowledgeBaseNote[]> {
    // Obsidian Local REST API doesn't have a direct list endpoint
    // We can use the search endpoint with empty query and folder filter
    const result = await this.searchNotes({
      query: '',
      folder,
      limit: 1000,
    });

    return result.notes;
  }

  async searchNotes(input: SearchNotesInput): Promise<SearchNotesResult> {
    // Use the simple search endpoint
    const params: Record<string, string> = {};

    if (input.query) {
      params.query = input.query;
    }

    if (input.folder) {
      params.contextLength = '100';
    }

    let endpoint = '/search/simple/';
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint = `/search/simple/?${searchParams}`;
    }

    try {
      const response = await this.request(endpoint, {
        method: 'POST',
        body: {
          query: input.query || '*',
        },
      });

      // Response is an array of search results
      const results = Array.isArray(response) ? response : [];

      const notes = results.slice(0, input.limit || 50).map((r: any) => ({
        path: r.filename,
        name: this.getFilename(r.filename),
        content: r.matches?.map((m: any) => m.match).join('\n...') || '',
        folder: this.getFolder(r.filename),
      }));

      return {
        notes,
        total: results.length,
      };
    } catch (error) {
      // If search fails, return empty results
      this.logger.warn(`Search failed: ${error.message}`);
      return { notes: [], total: 0 };
    }
  }

  async createNote(input: CreateNoteInput): Promise<KnowledgeBaseNote> {
    const normalizedPath = this.normalizePath(input.path);

    // Check if file exists
    if (!input.overwrite) {
      try {
        await this.getNote(normalizedPath);
        throw new Error(`Note already exists: ${normalizedPath}`);
      } catch (error) {
        if (
          !error.message.includes('404') &&
          !error.message.includes('Not Found')
        ) {
          if (error.message.includes('already exists')) {
            throw error;
          }
        }
        // File doesn't exist, continue
      }
    }

    // Create the note using PUT
    await this.request(`/vault/${encodeURIComponent(normalizedPath)}`, {
      method: 'PUT',
      body: input.content,
      contentType: 'text/markdown',
    });

    return this.getNote(normalizedPath);
  }

  async updateNote(
    path: string,
    input: UpdateNoteInput,
  ): Promise<KnowledgeBaseNote> {
    const normalizedPath = this.normalizePath(path);

    if (input.content !== undefined) {
      // Full content replacement
      await this.request(`/vault/${encodeURIComponent(normalizedPath)}`, {
        method: 'PUT',
        body: input.content,
        contentType: 'text/markdown',
      });
    } else if (input.append) {
      // Append to file
      await this.request(`/vault/${encodeURIComponent(normalizedPath)}`, {
        method: 'POST',
        body: input.append,
        contentType: 'text/markdown',
      });
    } else if (input.prepend) {
      // Get current content and prepend
      const current = await this.getNote(normalizedPath);
      const newContent = input.prepend + current.content;
      await this.request(`/vault/${encodeURIComponent(normalizedPath)}`, {
        method: 'PUT',
        body: newContent,
        contentType: 'text/markdown',
      });
    }

    return this.getNote(normalizedPath);
  }

  async deleteNote(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    await this.request(`/vault/${encodeURIComponent(normalizedPath)}`, {
      method: 'DELETE',
    });

    this.logger.log(`Note deleted: ${normalizedPath}`);
  }

  async appendToNote(
    path: string,
    content: string,
  ): Promise<KnowledgeBaseNote> {
    return this.updateNote(path, { append: content });
  }

  async getCommands(): Promise<KnowledgeBaseCommand[]> {
    const response = await this.request('/commands/');

    const commands = Array.isArray(response.commands) ? response.commands : [];

    return commands.map((c: any) => ({
      id: c.id,
      name: c.name,
    }));
  }

  async executeCommand(commandId: string): Promise<void> {
    await this.request(`/commands/${encodeURIComponent(commandId)}/`, {
      method: 'POST',
    });

    this.logger.log(`Command executed: ${commandId}`);
  }

  async getActiveNote(): Promise<KnowledgeBaseNote | null> {
    try {
      const content = await this.request('/active/', {
        returnRaw: true,
      });

      if (!content) {
        return null;
      }

      // The active endpoint returns the active file path in the header
      // For now, we return a partial note
      return {
        path: 'active',
        name: 'Active Note',
        content,
      };
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async openNote(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    await this.request('/open/', {
      method: 'POST',
      body: { file: normalizedPath },
    });

    this.logger.log(`Note opened: ${normalizedPath}`);
  }

  async getPeriodicNote(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  ): Promise<KnowledgeBaseNote | null> {
    try {
      const content = await this.request(`/periodic/${period}/`, {
        returnRaw: true,
      });

      if (!content) {
        return null;
      }

      return {
        path: `periodic/${period}`,
        name: `${period.charAt(0).toUpperCase() + period.slice(1)} Note`,
        content,
      };
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Insert content into the active note at cursor position
   */
  async insertIntoActiveNote(content: string): Promise<void> {
    await this.request('/active/', {
      method: 'POST',
      body: content,
      contentType: 'text/markdown',
    });
  }

  /**
   * Patch/update content in the active note using heading
   */
  async patchActiveNote(
    heading: string,
    content: string,
    contentInsertionPosition: 'beginning' | 'end' = 'end',
  ): Promise<void> {
    await this.request('/active/', {
      method: 'PATCH',
      body: content,
      contentType: 'text/markdown',
      headers: {
        Heading: heading,
        'Content-Insertion-Position': contentInsertionPosition,
      },
    });
  }

  // Private helper methods

  private async request(
    path: string,
    options: {
      method?: string;
      body?: any;
      contentType?: string;
      headers?: Record<string, string>;
      returnRaw?: boolean;
    } = {},
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';

    this.logger.debug(`Obsidian API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = options.contentType || 'application/json';
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      // @ts-expect-error - Node.js fetch agent option
      agent: this.httpsAgent,
    };

    if (options.body !== undefined) {
      if (
        options.contentType === 'text/markdown' ||
        typeof options.body === 'string'
      ) {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Obsidian API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        if (errorBody) {
          errorMessage = errorBody;
        }
      }

      this.logger.error(`Obsidian API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Handle raw text responses
    if (options.returnRaw) {
      return response.text();
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return text || null;
    }

    return response.json();
  }

  private normalizePath(path: string): string {
    // Remove leading slashes
    let normalized = path.replace(/^\/+/, '');

    // Ensure .md extension
    if (!normalized.endsWith('.md')) {
      normalized += '.md';
    }

    return normalized;
  }

  private getFilename(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1].replace(/\.md$/, '');
  }

  private getFolder(path: string): string {
    const parts = path.split('/');
    if (parts.length === 1) {
      return '';
    }
    return parts.slice(0, -1).join('/');
  }

  private parseNote(path: string, content: string): KnowledgeBaseNote {
    const note: KnowledgeBaseNote = {
      path,
      name: this.getFilename(path),
      content,
      folder: this.getFolder(path),
    };

    // Parse frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
      try {
        note.frontmatter = this.parseYamlFrontmatter(frontmatterMatch[1]);
        note.tags = this.extractTags(note.frontmatter, content);
      } catch {
        // Ignore frontmatter parsing errors
      }
    } else {
      note.tags = this.extractTagsFromContent(content);
    }

    return note;
  }

  private parseYamlFrontmatter(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          result[key] = value
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''));
        } else {
          result[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }

    return result;
  }

  private extractTags(
    frontmatter: Record<string, unknown>,
    content: string,
  ): string[] {
    const tags: Set<string> = new Set();

    // Tags from frontmatter
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((t) => tags.add(String(t)));
    } else if (typeof frontmatter.tags === 'string') {
      tags.add(frontmatter.tags);
    }

    // Tags from content
    const contentTags = this.extractTagsFromContent(content);
    contentTags.forEach((t) => tags.add(t));

    return Array.from(tags);
  }

  private extractTagsFromContent(content: string): string[] {
    const tags: string[] = [];
    const tagRegex = /#([a-zA-Z0-9_-]+)/g;
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      // Skip markdown headers
      if (
        !content.slice(Math.max(0, match.index - 1), match.index).match(/^#/)
      ) {
        tags.push(match[1]);
      }
    }

    return tags;
  }
}

/**
 * Factory function to create Obsidian adapter from integration config
 */
export function createObsidianAdapter(config: {
  baseUrl?: string;
  apiKey: string;
  insecure?: boolean;
}): KnowledgeBasePort {
  return new ObsidianAdapter(config);
}
