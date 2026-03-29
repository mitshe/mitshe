/**
 * Slack Notification Executor
 * Handles: action:slack_message, action:slack_notify, action:slack_send
 *
 * Uses Slack Web API with Bot Token (preferred) or Webhook URL (fallback)
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { logger } from '../../logger.js';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  [key: string]: unknown;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
  message?: {
    ts: string;
    text: string;
  };
}

export class SlackExecutor extends BaseExecutor {
  readonly supportedTypes = [
    'action:slack_message',
    'action:slack_notify',
    'action:slack_send',
  ];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const message = this.getString(config, 'message');

    // Get channel: config > credentials.defaultChannel
    const channel =
      this.getOptionalString(config, 'channel') ||
      ctx.credentials.slack?.defaultChannel;

    // Get credentials
    const botToken = ctx.credentials.slack?.botToken;
    const webhookUrl =
      this.getOptionalString(config, 'webhookUrl') ||
      ctx.credentials.slack?.webhookUrl;

    // Optional formatting
    const username = this.getOptionalString(config, 'username') || 'Mitshe Workflow';
    const iconEmoji = this.getOptionalString(config, 'iconEmoji') || ':robot_face:';
    const blocks = config.blocks as SlackBlock[] | undefined;

    // Use Bot Token API (preferred) or Webhook (fallback)
    if (botToken) {
      return this.sendWithBotToken(botToken, {
        channel,
        message,
        username,
        iconEmoji,
        blocks,
      });
    } else if (webhookUrl) {
      return this.sendWithWebhook(webhookUrl, {
        channel,
        message,
        username,
        iconEmoji,
        blocks,
      });
    } else {
      throw new Error(
        'Slack credentials not configured. ' +
        'Add Slack integration with Bot Token in Settings → Integrations.',
      );
    }
  }

  /**
   * Send message using Slack Web API (Bot Token)
   * https://api.slack.com/methods/chat.postMessage
   */
  private async sendWithBotToken(
    token: string,
    options: {
      channel?: string;
      message: string;
      username: string;
      iconEmoji: string;
      blocks?: SlackBlock[];
    },
  ): Promise<Record<string, unknown>> {
    if (!options.channel) {
      throw new Error(
        'Slack channel is required. ' +
        'Set defaultChannel in Slack integration or provide channel in node config.',
      );
    }

    logger.info(`Sending Slack message to ${options.channel} via Bot API`);

    const payload: Record<string, unknown> = {
      channel: options.channel,
      text: options.message,
      username: options.username,
      icon_emoji: options.iconEmoji,
    };

    if (options.blocks && options.blocks.length > 0) {
      payload.blocks = options.blocks;
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SlackApiResponse;

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
      }

      logger.info(`Slack message sent successfully to ${options.channel}`);

      return {
        sent: true,
        channel: data.channel || options.channel,
        timestamp: data.ts,
        method: 'bot_api',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Slack message: ${errorMessage}`);
    }
  }

  /**
   * Send message using Slack Incoming Webhook (legacy fallback)
   */
  private async sendWithWebhook(
    webhookUrl: string,
    options: {
      channel?: string;
      message: string;
      username: string;
      iconEmoji: string;
      blocks?: SlackBlock[];
    },
  ): Promise<Record<string, unknown>> {
    logger.info(`Sending Slack message via Webhook${options.channel ? ` to ${options.channel}` : ''}`);

    const payload: Record<string, unknown> = {
      text: options.message,
      username: options.username,
      icon_emoji: options.iconEmoji,
    };

    if (options.channel) {
      payload.channel = options.channel;
    }

    if (options.blocks && options.blocks.length > 0) {
      payload.blocks = options.blocks;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack webhook error (${response.status}): ${errorText}`);
      }

      logger.info('Slack message sent successfully via Webhook');

      return {
        sent: true,
        channel: options.channel || 'webhook_default',
        method: 'webhook',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Slack message: ${errorMessage}`);
    }
  }
}
