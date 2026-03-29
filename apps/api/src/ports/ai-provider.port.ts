/**
 * Port for AI provider integrations (Claude API, OpenAI, Local Claude Code)
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  finishReason: 'stop' | 'length' | 'tool_use' | 'error' | 'max_tokens';
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIResponseWithTools extends AIResponse {
  toolCalls?: ToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  stopSequences?: string[];
  metadata?: Record<string, string>;
}

export interface StreamEvent {
  type:
    | 'text_delta'
    | 'tool_use_start'
    | 'tool_use_delta'
    | 'message_stop'
    | 'error';
  text?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
}

/**
 * Core AI provider port - all AI providers must implement this
 */
export interface AIProviderPort {
  /**
   * Provider type identifier
   */
  getProviderType(): 'claude' | 'openai' | 'gemini' | 'local';

  /**
   * Get provider name for logging
   */
  getProviderName(): string;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Test connection
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * List available models
   */
  listModels(): Promise<string[]>;

  /**
   * Send a completion request
   */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<AIResponse>;

  /**
   * Send a completion request with tool support
   */
  completeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: CompletionOptions,
  ): Promise<AIResponseWithTools>;

  /**
   * Stream a completion (returns async generator)
   */
  streamComplete(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent, void, unknown>;
}

/**
 * Optional capability: Token counting
 * Use type guard `hasTokenCounting()` to check before calling
 */
export interface TokenCountingAIProviderPort extends AIProviderPort {
  countTokens(text: string): Promise<number>;
}

// Type guard for checking token counting capability
export function hasTokenCounting(port: AIProviderPort): port is TokenCountingAIProviderPort {
  return 'countTokens' in port && typeof (port as TokenCountingAIProviderPort).countTokens === 'function';
}

export const AI_PROVIDER_PORT = Symbol('AIProviderPort');
