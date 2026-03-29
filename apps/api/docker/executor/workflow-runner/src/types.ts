/**
 * Workflow Runner Types
 * Shared types between host and container
 */

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
  onError?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
}

/**
 * AI Provider types
 */
export type AIProviderType = 'claude' | 'openai' | 'openrouter' | 'gemini' | 'groq';

/**
 * AI Credentials for each provider
 */
export interface AICredentials {
  claude?: string;
  openai?: string;
  openrouter?: string;
  gemini?: string;
  groq?: string;
  defaultProvider?: AIProviderType;
}

/**
 * Git Provider types
 */
export type GitProviderType = 'github' | 'gitlab';

/**
 * Slack Credentials
 */
export interface SlackCredentials {
  botToken?: string;
  defaultChannel?: string;
  webhookUrl?: string;  // Legacy fallback
}

/**
 * Discord Credentials
 */
export interface DiscordCredentials {
  webhookUrl?: string;
  botToken?: string;
  defaultChannelId?: string;
}

/**
 * Telegram Credentials
 */
export interface TelegramCredentials {
  botToken?: string;
  defaultChatId?: string;
}

export interface WorkflowJob {
  executionId: string;
  workflowId: string;
  organizationId: string;
  definition: WorkflowDefinition;
  triggerData: Record<string, unknown>;
  credentials: {
    ai: AICredentials;
    git?: {
      token: string;
      provider: GitProviderType;
    };
    slack?: SlackCredentials;
    discord?: DiscordCredentials;
    telegram?: TelegramCredentials;
  };
  config?: {
    workingDir?: string;
    timeout?: number;
  };
}

export interface NodeResult {
  nodeId: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt: string;
  duration: number;
}

export interface WorkflowResult {
  executionId: string;
  status: 'completed' | 'failed';
  nodeResults: NodeResult[];
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt: string;
  duration: number;
}

// Events emitted to stdout as JSON lines
export type RunnerEvent =
  | { type: 'workflow:started'; executionId: string; timestamp: string }
  | { type: 'node:started'; nodeId: string; nodeName: string; nodeType: string; timestamp: string }
  | { type: 'node:completed'; nodeId: string; nodeName: string; nodeType: string; output?: Record<string, unknown>; duration: number; timestamp: string }
  | { type: 'node:failed'; nodeId: string; nodeName: string; nodeType: string; error: string; duration: number; timestamp: string }
  | { type: 'workflow:completed'; result: WorkflowResult; timestamp: string }
  | { type: 'workflow:failed'; error: string; result: WorkflowResult; timestamp: string }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: string };
