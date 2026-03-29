import { Logger } from '@nestjs/common';
import {
  NotificationPort,
  NotificationRecipient,
  NotificationMessage,
  NotificationResult,
  SlackChannel,
  SlackUser,
} from '../../../ports/notification.port';

/**
 * Slack Web API Adapter
 *
 * Supports:
 * - Sending messages to channels and users
 * - Rich message formatting with blocks
 * - File uploads
 * - Channel and user listing
 *
 * Authentication:
 * - Bot Token (xoxb-...)
 * - User Token (xoxp-...) for user-specific actions
 *
 * @see https://api.slack.com/web
 * @see https://api.slack.com/methods
 */
export class SlackAdapter implements NotificationPort {
  private readonly logger = new Logger(SlackAdapter.name);
  private readonly baseUrl = 'https://slack.com/api';
  private readonly token: string;
  private readonly botName?: string;
  private readonly iconEmoji?: string;

  constructor(config: {
    botToken: string;
    botName?: string;
    iconEmoji?: string;
  }) {
    this.token = config.botToken;
    this.botName = config.botName;
    this.iconEmoji = config.iconEmoji || ':robot_face:';
  }

  getProviderType(): 'slack' {
    return 'slack';
  }

  getProviderName(): string {
    return 'Slack';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('auth.test');

      if (response.ok) {
        this.logger.log(
          `Slack connection successful for team: ${response.team} (${response.user})`,
        );
        return { success: true };
      }

      return { success: false, error: response.error || 'Unknown error' };
    } catch (error) {
      this.logger.error(`Slack connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async isConfigured(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  async send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    try {
      const channel = this.resolveChannel(recipient);
      const blocks = this.buildMessageBlocks(message);

      this.logger.debug(
        `Sending Slack message to channel: ${channel}, title: ${message.title}`,
      );

      const response = await this.request('chat.postMessage', {
        channel,
        text: message.title, // Fallback for notifications
        blocks,
        username: this.botName,
        icon_emoji: this.iconEmoji,
      });

      this.logger.debug(`Slack API response: ${JSON.stringify(response)}`);

      if (response.ok) {
        this.logger.log(
          `Slack message sent successfully to ${channel}, ts: ${response.ts}`,
        );
        return {
          success: true,
          messageId: response.ts,
          timestamp: response.ts,
        };
      }

      this.logger.error(
        `Slack API returned error: ${response.error} for channel: ${channel}`,
      );
      return {
        success: false,
        error: response.error || 'Failed to send message',
      };
    } catch (error) {
      this.logger.error(`Failed to send Slack message: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBatch(
    recipients: NotificationRecipient[],
    message: NotificationMessage,
  ): Promise<NotificationResult[]> {
    // Send to all recipients in parallel
    const results = await Promise.all(
      recipients.map((recipient) => this.send(recipient, message)),
    );

    return results;
  }

  async listChannels(): Promise<SlackChannel[]> {
    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request('conversations.list', {
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to list channels');
      }

      for (const channel of response.channels || []) {
        channels.push({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private || false,
          isMember: channel.is_member || false,
        });
      }

      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return channels;
  }

  async searchUsers(query: string): Promise<SlackUser[]> {
    // Slack doesn't have a direct search endpoint, so we list and filter
    const response = await this.request('users.list', {
      limit: 200,
    });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to list users');
    }

    const queryLower = query.toLowerCase();

    return (response.members || [])
      .filter((user: any) => {
        if (user.deleted || user.is_bot) return false;

        const name = user.name?.toLowerCase() || '';
        const realName = user.real_name?.toLowerCase() || '';
        const email = user.profile?.email?.toLowerCase() || '';

        return (
          name.includes(queryLower) ||
          realName.includes(queryLower) ||
          email.includes(queryLower)
        );
      })
      .slice(0, 20)
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        realName: user.real_name || user.name,
        email: user.profile?.email,
      }));
  }

  /**
   * Send a direct message to a user by email
   */
  async sendToUserByEmail(
    email: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    try {
      // Lookup user by email
      const lookupResponse = await this.request('users.lookupByEmail', {
        email,
      });

      if (!lookupResponse.ok) {
        return {
          success: false,
          error: `User not found: ${email}`,
        };
      }

      const userId = lookupResponse.user?.id;

      if (!userId) {
        return {
          success: false,
          error: `User ID not found for: ${email}`,
        };
      }

      // Open DM channel
      const openResponse = await this.request('conversations.open', {
        users: userId,
      });

      if (!openResponse.ok) {
        return {
          success: false,
          error: `Failed to open DM: ${openResponse.error}`,
        };
      }

      // Send message
      return this.send(
        { type: 'channel', id: openResponse.channel.id },
        message,
      );
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    channel: string,
    timestamp: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    try {
      const blocks = this.buildMessageBlocks(message);

      const response = await this.request('chat.update', {
        channel,
        ts: timestamp,
        text: message.title,
        blocks,
      });

      if (response.ok) {
        return {
          success: true,
          messageId: response.ts,
          timestamp: response.ts,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to update message',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channel: string,
    timestamp: string,
    emoji: string,
  ): Promise<boolean> {
    try {
      const response = await this.request('reactions.add', {
        channel,
        timestamp,
        name: emoji.replace(/:/g, ''),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async request(
    method: string,
    params?: Record<string, any>,
  ): Promise<any> {
    const url = `${this.baseUrl}/${method}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  private resolveChannel(recipient: NotificationRecipient): string {
    switch (recipient.type) {
      case 'channel':
        // Ensure channel ID format
        return recipient.id.startsWith('#')
          ? recipient.id.substring(1)
          : recipient.id;

      case 'user':
        // User IDs start with U
        return recipient.id;

      case 'webhook':
        throw new Error('Use sendToWebhook for webhook recipients');

      case 'email':
        throw new Error('Use sendToUserByEmail for email recipients');

      default:
        return recipient.id;
    }
  }

  private buildMessageBlocks(message: NotificationMessage): any[] {
    const blocks: any[] = [];

    // Severity indicator with color
    const severityConfig = {
      info: { emoji: ':information_source:', color: '#2196F3' },
      success: { emoji: ':white_check_mark:', color: '#4CAF50' },
      warning: { emoji: ':warning:', color: '#FF9800' },
      error: { emoji: ':x:', color: '#F44336' },
    };

    const severity = message.severity || 'info';
    const config = severityConfig[severity];

    // Only add header if title is provided
    if (message.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${config.emoji} ${message.title}`,
          emoji: true,
        },
      });
    }

    // Body - prefix with emoji if no title
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.title ? message.body : `${config.emoji} ${message.body}`,
      },
    });

    // Action button if URL provided
    if (message.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
              emoji: true,
            },
            url: message.url,
            action_id: 'view_details',
          },
        ],
      });
    }

    // Metadata context
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      const contextElements = Object.entries(message.metadata).map(
        ([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:* ${value}`,
        }),
      );

      blocks.push({
        type: 'context',
        elements: contextElements.slice(0, 10), // Max 10 elements
      });
    }

    // Code attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.type === 'code') {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                '```' +
                (attachment.language || '') +
                '\n' +
                attachment.content +
                '\n```',
            },
          });
        }
      }
    }

    // Divider at the end
    blocks.push({
      type: 'divider',
    });

    return blocks;
  }
}

/**
 * Slack Incoming Webhook Adapter
 * For simpler integrations using incoming webhooks
 */
export class SlackWebhookAdapter implements NotificationPort {
  private readonly logger = new Logger(SlackWebhookAdapter.name);
  private readonly webhookUrl: string;

  constructor(config: { webhookUrl: string }) {
    this.webhookUrl = config.webhookUrl;
  }

  getProviderType(): 'slack' {
    return 'slack';
  }

  getProviderName(): string {
    return 'Slack Webhook';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a test message
      const result = await this.send(
        { type: 'webhook', id: this.webhookUrl },
        {
          title: 'Connection Test',
          body: 'This is a test message to verify the webhook connection.',
          severity: 'info',
        },
      );

      return result.success
        ? { success: true }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  isConfigured(): Promise<boolean> {
    return Promise.resolve(!!this.webhookUrl);
  }

  async send(
    _recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    try {
      const payload = this.buildWebhookPayload(message);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text();
      return {
        success: false,
        error: `Webhook error: ${response.status} - ${errorText}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBatch(
    recipients: NotificationRecipient[],
    message: NotificationMessage,
  ): Promise<NotificationResult[]> {
    // Webhook sends to a single configured channel
    const result = await this.send(recipients[0], message);
    return [result];
  }

  private buildWebhookPayload(message: NotificationMessage): any {
    const severityEmoji = {
      info: ':information_source:',
      success: ':white_check_mark:',
      warning: ':warning:',
      error: ':x:',
    };

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[message.severity || 'info']} ${message.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.body,
        },
      },
    ];

    if (message.url) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${message.url}|View Details>`,
        },
      });
    }

    return {
      text: message.title,
      blocks,
    };
  }
}

/**
 * Factory functions
 */
export function createSlackAdapter(config: {
  botToken: string;
  botName?: string;
  iconEmoji?: string;
}): NotificationPort {
  return new SlackAdapter(config);
}

export function createSlackWebhookAdapter(config: {
  webhookUrl: string;
}): NotificationPort {
  return new SlackWebhookAdapter(config);
}
