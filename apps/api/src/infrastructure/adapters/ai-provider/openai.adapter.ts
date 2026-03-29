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
 * OpenAI API Adapter
 *
 * Supports:
 * - Chat Completions API (gpt-4, gpt-3.5-turbo, etc.)
 * - Function/Tool calling
 * - Streaming responses
 *
 * @see https://platform.openai.com/docs/api-reference/chat
 */
export class OpenAIAdapter implements AIProviderPort {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly organization?: string;

  constructor(config: {
    apiKey: string;
    defaultModel?: string;
    baseUrl?: string; // For Azure OpenAI or compatible APIs
    organization?: string;
  }) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.organization = config.organization;
  }

  getProviderType(): 'openai' {
    return 'openai';
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  async isAvailable(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const models = await this.listModels();
      return { success: models.length > 0 };
    } catch (error) {
      this.logger.error(`OpenAI connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async listModels(): Promise<string[]> {
    const response = await this.request('models', undefined, 'GET');

    return response.data
      .filter((model: any) => model.id.startsWith('gpt'))
      .map((model: any) => model.id);
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<AIResponse> {
    const response = await this.request('chat/completions', {
      model: options?.model || this.defaultModel,
      messages: this.formatMessages(messages, options?.systemPrompt),
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop: options?.stopSequences,
    });

    const choice = response.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: response.model,
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
      finishReason: this.mapFinishReason(choice?.finish_reason),
    };
  }

  async completeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: CompletionOptions,
  ): Promise<AIResponseWithTools> {
    const response = await this.request('chat/completions', {
      model: options?.model || this.defaultModel,
      messages: this.formatMessages(messages, options?.systemPrompt),
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop: options?.stopSequences,
      tools: this.formatTools(tools),
      tool_choice: 'auto',
    });

    const choice = response.choices?.[0];
    const toolCalls = choice?.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || '{}'),
    }));

    return {
      content: choice?.message?.content || '',
      model: response.model,
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
      finishReason: this.mapFinishReason(choice?.finish_reason),
      toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
      stopReason: this.mapStopReason(choice?.finish_reason),
    };
  }

  async *streamComplete(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages: this.formatMessages(messages, options?.systemPrompt),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        stop: options?.stopSequences,
        tools: options?.tools ? this.formatTools(options.tools) : undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCall: {
      id?: string;
      name?: string;
      arguments?: string;
    } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { type: 'message_stop' };
              return;
            }

            try {
              const event = JSON.parse(data);
              const delta = event.choices?.[0]?.delta;

              if (delta?.content) {
                yield {
                  type: 'text_delta',
                  text: delta.content,
                };
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.id) {
                    // New tool call starting
                    if (currentToolCall) {
                      // Yield completed tool call
                      yield {
                        type: 'tool_use_start',
                        toolCall: {
                          id: currentToolCall.id,
                          name: currentToolCall.name,
                          input: JSON.parse(currentToolCall.arguments || '{}'),
                        },
                      };
                    }
                    currentToolCall = {
                      id: tc.id,
                      name: tc.function?.name,
                      arguments: tc.function?.arguments || '',
                    };
                  } else if (currentToolCall && tc.function?.arguments) {
                    currentToolCall.arguments =
                      (currentToolCall.arguments || '') + tc.function.arguments;
                  }
                }
              }

              if (
                event.choices?.[0]?.finish_reason === 'tool_calls' &&
                currentToolCall
              ) {
                yield {
                  type: 'tool_use_start',
                  toolCall: {
                    id: currentToolCall.id,
                    name: currentToolCall.name,
                    input: JSON.parse(currentToolCall.arguments || '{}'),
                  },
                };
                currentToolCall = null;
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
    // OpenAI doesn't have a public token counting API
    // Use approximation: ~4 characters per token
    return Promise.resolve(Math.ceil(text.length / 4));
  }

  // Private helper methods

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  private async request(
    endpoint: string,
    body?: Record<string, any>,
    method: string = 'POST',
  ): Promise<any> {
    // Remove undefined values
    const cleanBody = body
      ? Object.entries(body).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, any>,
        )
      : undefined;

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method,
      headers: this.getHeaders(),
      body: cleanBody ? JSON.stringify(cleanBody) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `OpenAI API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        errorMessage += ` - ${errorBody}`;
      }

      this.logger.error(`OpenAI API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return response.json();
  }

  private formatMessages(messages: Message[], systemPrompt?: string): any[] {
    const formatted: any[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      formatted.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    for (const message of messages) {
      if (message.role === 'system' && !systemPrompt) {
        formatted.push({
          role: 'system',
          content:
            typeof message.content === 'string'
              ? message.content
              : message.content
                  .filter((c) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join(''),
        });
      } else if (message.role === 'tool') {
        // OpenAI expects tool results as 'tool' role messages
        const content =
          typeof message.content === 'string'
            ? message.content
            : message.content
                .filter((c) => c.type === 'tool_result')
                .map((c: any) => ({
                  role: 'tool',
                  tool_call_id: c.tool_use_id,
                  content: c.content,
                }));

        if (Array.isArray(content)) {
          formatted.push(...content);
        } else {
          formatted.push({
            role: 'tool',
            content,
          });
        }
      } else if (message.role === 'assistant') {
        const msg: any = {
          role: 'assistant',
        };

        if (typeof message.content === 'string') {
          msg.content = message.content;
        } else {
          // Handle tool use in assistant messages
          const textContent = message.content
            .filter((c) => c.type === 'text')
            .map((c: any) => c.text)
            .join('');

          const toolUses = message.content.filter((c) => c.type === 'tool_use');

          if (textContent) {
            msg.content = textContent;
          }

          if (toolUses.length > 0) {
            msg.tool_calls = toolUses.map((tu: any) => ({
              id: tu.id,
              type: 'function',
              function: {
                name: tu.name,
                arguments: JSON.stringify(tu.input),
              },
            }));
          }
        }

        formatted.push(msg);
      } else {
        formatted.push({
          role: message.role,
          content:
            typeof message.content === 'string'
              ? message.content
              : message.content
                  .filter((c) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join(''),
        });
      }
    }

    return formatted;
  }

  private formatTools(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  private mapFinishReason(
    reason: string,
  ): 'stop' | 'length' | 'tool_use' | 'error' | 'max_tokens' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'max_tokens';
      case 'tool_calls':
        return 'tool_use';
      case 'content_filter':
        return 'error';
      default:
        return 'stop';
    }
  }

  private mapStopReason(
    reason: string,
  ): 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' {
    switch (reason) {
      case 'stop':
        return 'end_turn';
      case 'length':
        return 'max_tokens';
      case 'tool_calls':
        return 'tool_use';
      default:
        return 'end_turn';
    }
  }
}

/**
 * Factory function to create OpenAI adapter
 */
export function createOpenAIAdapter(config: {
  apiKey: string;
  defaultModel?: string;
  baseUrl?: string;
  organization?: string;
}): AIProviderPort {
  return new OpenAIAdapter(config);
}
