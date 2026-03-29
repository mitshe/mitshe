/**
 * Telegram Bot Adapter
 *
 * Implements NotificationPort for Telegram Bot API integration.
 * Uses the Bot API to send messages to chats/groups/channels.
 */

import {
  NotificationPort,
  NotificationRecipient,
  NotificationMessage,
  NotificationResult,
} from '../../../ports/notification.port';

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  chat: {
    id: number;
    type: string;
  };
}

export class TelegramAdapter implements NotificationPort {
  private readonly botToken: string;
  private readonly defaultChatId?: string;
  private readonly baseUrl = 'https://api.telegram.org';

  constructor(config: { botToken: string; defaultChatId?: string }) {
    this.botToken = config.botToken;
    this.defaultChatId = config.defaultChatId;
  }

  getProviderType(): 'telegram' {
    return 'telegram';
  }

  getProviderName(): string {
    return 'Telegram';
  }

  isConfigured(): Promise<boolean> {
    return Promise.resolve(!!this.botToken);
  }

  private get apiUrl(): string {
    return `${this.baseUrl}/bot${this.botToken}`;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken) {
      return { success: false, error: 'Bot token is required' };
    }

    // Basic token format validation
    if (!this.botToken.includes(':')) {
      return {
        success: false,
        error:
          'Invalid bot token format. Expected format: 123456789:ABCdefGHI...',
      };
    }

    try {
      // Use getMe to verify the bot token is valid
      const response = await fetch(`${this.apiUrl}/getMe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: TelegramResponse<TelegramBotInfo> = await response.json();

      if (!data.ok) {
        if (data.error_code === 401) {
          return { success: false, error: 'Invalid bot token' };
        }
        return {
          success: false,
          error: data.description || 'Unknown Telegram API error',
        };
      }

      // If defaultChatId is provided, verify we can access it
      if (this.defaultChatId) {
        const chatCheck = await this.verifyChatAccess(this.defaultChatId);
        if (!chatCheck.success) {
          return {
            success: false,
            error: `Bot token valid, but cannot access chat: ${chatCheck.error}`,
          };
        }
      }

      return {
        success: true,
        error: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect: ${(error as Error).message}`,
      };
    }
  }

  private async verifyChatAccess(
    chatId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: chatId }),
      });

      const data: TelegramResponse<unknown> = await response.json();

      if (!data.ok) {
        return {
          success: false,
          error: data.description || 'Cannot access chat',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const chatId = recipient.id || this.defaultChatId;

    if (!chatId) {
      return {
        success: false,
        error: 'No chat ID provided and no default chat ID configured',
      };
    }

    try {
      const text = this.formatMessage(message);

      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: !message.url,
        }),
      });

      const data: TelegramResponse<TelegramMessage> = await response.json();

      if (!data.ok) {
        return {
          success: false,
          error: data.description || 'Failed to send message',
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id.toString(),
        timestamp: new Date(data.result!.date * 1000).toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send message: ${(error as Error).message}`,
      };
    }
  }

  async sendBatch(
    recipients: NotificationRecipient[],
    message: NotificationMessage,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const recipient of recipients) {
      const result = await this.send(recipient, message);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return results;
  }

  private formatMessage(message: NotificationMessage): string {
    const parts: string[] = [];

    // Severity emoji
    const severityEmoji = this.getSeverityEmoji(message.severity);

    // Title with severity
    parts.push(`${severityEmoji} <b>${this.escapeHtml(message.title)}</b>`);

    // Body
    if (message.body) {
      parts.push('');
      parts.push(this.escapeHtml(message.body));
    }

    // URL
    if (message.url) {
      parts.push('');
      parts.push(`🔗 <a href="${message.url}">View Details</a>`);
    }

    // Metadata
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      parts.push('');
      parts.push('─────────────');
      for (const [key, value] of Object.entries(message.metadata)) {
        parts.push(`<b>${this.escapeHtml(key)}:</b> ${this.escapeHtml(value)}`);
      }
    }

    // Code attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.type === 'code') {
          parts.push('');
          if (attachment.title) {
            parts.push(`📝 <b>${this.escapeHtml(attachment.title)}</b>`);
          }
          // Telegram has a 4096 char limit, so truncate code
          const code = attachment.content.slice(0, 3000);
          parts.push(`<pre><code>${this.escapeHtml(code)}</code></pre>`);
        }
      }
    }

    return parts.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private getSeverityEmoji(
    severity?: 'info' | 'success' | 'warning' | 'error',
  ): string {
    switch (severity) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  }
}

/**
 * Factory function to create Telegram adapter
 */
export function createTelegramAdapter(config: {
  botToken: string;
  defaultChatId?: string;
}): NotificationPort {
  return new TelegramAdapter(config);
}
