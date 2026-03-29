/**
 * Adapter Registry - Registry pattern for adapter creation (OCP compliant)
 *
 * Instead of switch statements, adapters register their creator functions.
 * New adapters can be added without modifying existing code.
 */

import { IssueTrackerPort } from '../../ports/issue-tracker.port';
import { GitProviderPort } from '../../ports/git-provider.port';
import { NotificationPort } from '../../ports/notification.port';
import { AIProviderPort } from '../../ports/ai-provider.port';
import { KnowledgeBasePort } from '../../ports/knowledge-base.port';

export interface AdapterConfig {
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  apiKey?: string;
  accessToken?: string;
  tokenType?: string;
  botToken?: string;
  webhookUrl?: string;
  botName?: string;
  iconEmoji?: string;
  defaultModel?: string;
  organization?: string;
  insecure?: boolean;
  username?: string;
  avatarUrl?: string;
  defaultChatId?: string;
  [key: string]: unknown;
}

// Generic adapter creator type
type AdapterCreator<T> = (config: AdapterConfig) => T;

/**
 * Type-safe adapter registry
 */
class AdapterRegistry<T> {
  private creators = new Map<string, AdapterCreator<T>>();
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  register(type: string, creator: AdapterCreator<T>): void {
    this.creators.set(type.toUpperCase(), creator);
  }

  has(type: string): boolean {
    return this.creators.has(type.toUpperCase());
  }

  create(type: string, config: AdapterConfig): T {
    const creator = this.creators.get(type.toUpperCase());
    if (!creator) {
      throw new Error(`Unknown ${this.name} type: ${type}. Available: ${this.getAvailableTypes().join(', ')}`);
    }
    return creator(config);
  }

  getAvailableTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}

// Singleton registries for each adapter type
export const issueTrackerRegistry = new AdapterRegistry<IssueTrackerPort>('issue tracker');
export const gitProviderRegistry = new AdapterRegistry<GitProviderPort>('git provider');
export const notificationRegistry = new AdapterRegistry<NotificationPort>('notification provider');
export const aiProviderRegistry = new AdapterRegistry<AIProviderPort>('AI provider');
export const knowledgeBaseRegistry = new AdapterRegistry<KnowledgeBasePort>('knowledge base');

// Issue tracker types for type checking
export const ISSUE_TRACKER_TYPES = ['JIRA', 'YOUTRACK', 'LINEAR'] as const;
export type IssueTrackerType = (typeof ISSUE_TRACKER_TYPES)[number];

// Git provider types
export const GIT_PROVIDER_TYPES = ['GITLAB', 'GITHUB'] as const;
export type GitProviderType = (typeof GIT_PROVIDER_TYPES)[number];

// Notification provider types
export const NOTIFICATION_TYPES = ['SLACK', 'DISCORD', 'TELEGRAM', 'TEAMS'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// AI provider types
export const AI_PROVIDER_TYPES = ['CLAUDE', 'OPENAI', 'OPENROUTER', 'GEMINI', 'GROQ', 'CLAUDE_CODE_LOCAL'] as const;
export type AIProviderType = (typeof AI_PROVIDER_TYPES)[number];

// Knowledge base types
export const KNOWLEDGE_BASE_TYPES = ['OBSIDIAN'] as const;
export type KnowledgeBaseType = (typeof KNOWLEDGE_BASE_TYPES)[number];

// Type guards
export function isIssueTrackerType(type: string): type is IssueTrackerType {
  return ISSUE_TRACKER_TYPES.includes(type.toUpperCase() as IssueTrackerType);
}

export function isGitProviderType(type: string): type is GitProviderType {
  return GIT_PROVIDER_TYPES.includes(type.toUpperCase() as GitProviderType);
}

export function isNotificationType(type: string): type is NotificationType {
  return NOTIFICATION_TYPES.includes(type.toUpperCase() as NotificationType);
}

export function isAIProviderType(type: string): type is AIProviderType {
  return AI_PROVIDER_TYPES.includes(type.toUpperCase() as AIProviderType);
}

export function isKnowledgeBaseType(type: string): type is KnowledgeBaseType {
  return KNOWLEDGE_BASE_TYPES.includes(type.toUpperCase() as KnowledgeBaseType);
}
