import { Logger } from '@nestjs/common';
import {
  AIProviderPort,
  Message,
  AIResponse,
  AIResponseWithTools,
  CompletionOptions,
  ToolDefinition,
  StreamEvent,
} from '../../../ports/ai-provider.port';

/**
 * Claude API Adapter (Anthropic)
 *
 * Supports:
 * - Messages API (claude-3-opus, claude-3-sonnet, claude-3-haiku)
 * - Tool/Function calling
 * - Streaming responses
 *
 * @see https://docs.anthropic.com/claude/reference/messages_post
 */
export class ClaudeAdapter implements AIProviderPort {
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly apiVersion = '2023-06-01';

  constructor(config: { apiKey: string; defaultModel?: string }) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
  }

  getProviderType(): 'claude' {
    return 'claude';
  }

  getProviderName(): string {
    return 'Claude (Anthropic)';
  }

  async isAvailable(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a minimal request to verify the API key
      const response = await this.complete(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 10 },
      );

      return { success: !!response.content };
    } catch (error) {
      this.logger.error(`Claude connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  listModels(): Promise<string[]> {
    // Claude doesn't have a list models endpoint, return known models
    return Promise.resolve([
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ]);
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<AIResponse> {
    const response = await this.request('messages', {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      system: options?.systemPrompt,
      messages: this.formatMessages(messages),
      stop_sequences: options?.stopSequences,
      metadata: options?.metadata,
    });

    return {
      content: this.extractTextContent(response.content),
      model: response.model,
      tokensUsed: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
      finishReason: this.mapStopReason(response.stop_reason),
    };
  }

  async completeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: CompletionOptions,
  ): Promise<AIResponseWithTools> {
    const response = await this.request('messages', {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      system: options?.systemPrompt,
      messages: this.formatMessages(messages),
      tools: this.formatTools(tools),
      stop_sequences: options?.stopSequences,
      metadata: options?.metadata,
    });

    const toolCalls = response.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));

    return {
      content: this.extractTextContent(response.content),
      model: response.model,
      tokensUsed: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
      finishReason: this.mapStopReason(response.stop_reason),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: response.stop_reason,
    };
  }

  async *streamComplete(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        top_p: options?.topP,
        system: options?.systemPrompt,
        messages: this.formatMessages(messages),
        tools: options?.tools ? this.formatTools(options.tools) : undefined,
        stop_sequences: options?.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'message_stop' };
              return;
            }

            try {
              const event = JSON.parse(data);
              const streamEvent = this.parseStreamEvent(event);
              if (streamEvent) {
                yield streamEvent;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  countTokens(text: string): Promise<number> {
    // Claude API doesn't have a direct token counting endpoint
    // Use approximation: ~4 characters per token
    return Promise.resolve(Math.ceil(text.length / 4));
  }

  // Private helper methods

  private async request(
    endpoint: string,
    body: Record<string, any>,
  ): Promise<any> {
    // Remove undefined values
    const cleanBody = Object.entries(body).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(cleanBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Claude API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        errorMessage += ` - ${errorBody}`;
      }

      this.logger.error(`Claude API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return response.json();
  }

  private formatMessages(messages: Message[]): any[] {
    return messages
      .filter((m) => m.role !== 'system') // System is separate in Claude API
      .map((m) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((c) => {
                if (c.type === 'tool_result') {
                  return {
                    type: 'tool_result',
                    tool_use_id: c.tool_use_id,
                    content: c.content,
                    is_error: c.is_error,
                  };
                }
                return c;
              }),
      }));
  }

  private formatTools(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  private extractTextContent(content: any[]): string {
    return content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
  }

  private mapStopReason(
    reason: string,
  ): 'stop' | 'length' | 'tool_use' | 'error' | 'max_tokens' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'max_tokens';
      case 'tool_use':
        return 'tool_use';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  private parseStreamEvent(event: any): StreamEvent | null {
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta') {
          return {
            type: 'text_delta',
            text: event.delta.text,
          };
        }
        if (event.delta?.type === 'input_json_delta') {
          return {
            type: 'tool_use_delta',
            toolCall: { input: event.delta.partial_json },
          };
        }
        break;

      case 'content_block_start':
        if (event.content_block?.type === 'tool_use') {
          return {
            type: 'tool_use_start',
            toolCall: {
              id: event.content_block.id,
              name: event.content_block.name,
            },
          };
        }
        break;

      case 'message_stop':
        return { type: 'message_stop' };

      case 'error':
        return {
          type: 'error',
          error: event.error?.message || 'Unknown error',
        };
    }

    return null;
  }
}

/**
 * Factory function to create Claude adapter
 */
export function createClaudeAdapter(config: {
  apiKey: string;
  defaultModel?: string;
}): AIProviderPort {
  return new ClaudeAdapter(config);
}
