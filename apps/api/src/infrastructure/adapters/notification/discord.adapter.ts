/**
 * Discord Webhook Adapter
 *
 * Implements NotificationPort for Discord webhook integration.
 * Discord webhooks are simple - just POST JSON to the webhook URL.
 */

import {
  NotificationPort,
  NotificationRecipient,
  NotificationMessage,
  NotificationResult,
} from '../../../ports/notification.port';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordWebhookAdapter implements NotificationPort {
  private readonly webhookUrl: string;
  private readonly username?: string;
  private readonly avatarUrl?: string;

  constructor(config: {
    webhookUrl: string;
    username?: string;
    avatarUrl?: string;
  }) {
    this.webhookUrl = config.webhookUrl;
    this.username = config.username;
    this.avatarUrl = config.avatarUrl;
  }

  getProviderType(): 'discord' {
    return 'discord';
  }

  getProviderName(): string {
    return 'Discord';
  }

  isConfigured(): Promise<boolean> {
    return Promise.resolve(
      !!this.webhookUrl && this.isValidWebhookUrl(this.webhookUrl),
    );
  }

  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === 'discord.com' &&
        parsed.pathname.startsWith('/api/webhooks/')
      );
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookUrl) {
      return { success: false, error: 'Webhook URL is required' };
    }

    if (!this.isValidWebhookUrl(this.webhookUrl)) {
      return {
        success: false,
        error:
          'Invalid Discord webhook URL. Expected format: https://discord.com/api/webhooks/...',
      };
    }

    try {
      // GET request to webhook URL returns webhook info without posting
      const response = await fetch(this.webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          return { success: false, error: 'Invalid webhook token' };
        }
        if (response.status === 404) {
          return { success: false, error: 'Webhook not found or deleted' };
        }
        return {
          success: false,
          error: `Discord API error: ${response.status} - ${errorText}`,
        };
      }

      // Validate response is JSON (webhook info)
      await response.json();

      // Webhook is valid - we can see its info
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

  async send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    try {
      const payload = this.buildPayload(message);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Discord API error: ${response.status} - ${errorText}`,
        };
      }

      // Discord returns 204 No Content on success for webhooks
      // or 200 with message data if wait=true
      return {
        success: true,
        timestamp: new Date().toISOString(),
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
    // Discord webhooks send to a single channel, so we just send once
    const result = await this.send(recipients[0], message);
    return recipients.map(() => result);
  }

  private buildPayload(message: NotificationMessage): DiscordWebhookPayload {
    const embed: DiscordEmbed = {
      title: message.title,
      description: message.body,
      url: message.url,
      color: this.getSeverityColor(message.severity),
      timestamp: new Date().toISOString(),
    };

    // Add metadata as fields
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      embed.fields = Object.entries(message.metadata).map(([name, value]) => ({
        name,
        value,
        inline: true,
      }));
    }

    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      const codeAttachments = message.attachments.filter(
        (a) => a.type === 'code',
      );
      if (codeAttachments.length > 0) {
        // Add code as a field
        embed.fields = embed.fields || [];
        for (const attachment of codeAttachments) {
          embed.fields.push({
            name: attachment.title || 'Code',
            value: `\`\`\`${attachment.language || ''}\n${attachment.content.slice(0, 1000)}\n\`\`\``,
            inline: false,
          });
        }
      }
    }

    return {
      username: this.username,
      avatar_url: this.avatarUrl,
      embeds: [embed],
    };
  }

  private getSeverityColor(
    severity?: 'info' | 'success' | 'warning' | 'error',
  ): number {
    switch (severity) {
      case 'success':
        return 0x22c55e; // Green
      case 'warning':
        return 0xf59e0b; // Amber
      case 'error':
        return 0xef4444; // Red
      case 'info':
      default:
        return 0x3b82f6; // Blue
    }
  }
}

/**
 * Factory function to create Discord webhook adapter
 */
export function createDiscordAdapter(config: {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}): NotificationPort {
  return new DiscordWebhookAdapter(config);
}
