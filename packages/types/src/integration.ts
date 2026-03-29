// Integration types

export type IntegrationType =
  | "JIRA"
  | "YOUTRACK"
  | "LINEAR"
  | "GITLAB"
  | "GITHUB"
  | "SLACK"
  | "DISCORD"
  | "TELEGRAM"
  | "TEAMS"
  | "OBSIDIAN";

export enum IntegrationCategory {
  COMMUNICATION = "communication",
  DEVELOPMENT = "development",
  PROJECT = "project",
  KNOWLEDGE = "knowledge",
}

export interface Integration {
  id: string;
  type: IntegrationType;
  status: "CONNECTED" | "ERROR" | "DISCONNECTED";
  organizationId: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationDto {
  type: IntegrationType;
  config: Record<string, unknown>;
}

export interface UpdateIntegrationDto {
  config?: Record<string, unknown>;
}

// Integration configs
export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
}

export interface GitLabConfig {
  baseUrl: string;
  accessToken: string;
  projectId?: string;
}

export interface GitHubConfig {
  accessToken: string;
  owner: string;
  repo?: string;
}

export interface SlackConfig {
  botToken: string;
  defaultChannel?: string;
  webhookUrl?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

export interface LinearConfig {
  apiKey: string;
}
