/**
 * Discord Notification Executor
 * Handles: action:discord_message, action:discord_embed
 *
 * Uses Discord Webhooks for sending messages
 * https://discord.com/developers/docs/resources/webhook
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { logger } from '../../logger.js';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export class DiscordExecutor extends BaseExecutor {
  readonly supportedTypes = [
    'action:discord_message',
    'action:discord_embed',
  ];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const webhookUrl =
      this.getOptionalString(config, 'webhookUrl') ||
      ctx.credentials.discord?.webhookUrl;

    if (!webhookUrl) {
      throw new Error(
        'Discord webhook URL not configured. ' +
        'Add Discord integration in Settings → Integrations or provide webhookUrl in node config.',
      );
    }

    const nodeType = config._nodeType as string;

    if (nodeType === 'action:discord_embed') {
      return this.sendEmbed(webhookUrl, config);
    }

    return this.sendMessage(webhookUrl, config);
  }

  /**
   * Send a simple text message
   */
  private async sendMessage(
    webhookUrl: string,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const content = this.getString(config, 'message');
    const username = this.getOptionalString(config, 'username') || 'Mitshe Bot';
    const avatarUrl = this.getOptionalString(config, 'avatarUrl');

    logger.info('Sending Discord message');

    const payload: Record<string, unknown> = {
      content,
      username,
    };

    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    return this.sendToDiscord(webhookUrl, payload);
  }

  /**
   * Send a rich embed message
   */
  private async sendEmbed(
    webhookUrl: string,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const title = this.getOptionalString(config, 'title');
    const description = this.getOptionalString(config, 'description');
    const color = config.color as number | undefined;
    const url = this.getOptionalString(config, 'url');
    const username = this.getOptionalString(config, 'username') || 'Mitshe Bot';
    const fields = config.fields as DiscordEmbed['fields'];

    logger.info('Sending Discord embed');

    const embed: DiscordEmbed = {};

    if (title) embed.title = title;
    if (description) embed.description = description;
    if (color) embed.color = color;
    if (url) embed.url = url;
    if (fields) embed.fields = fields;

    // Add timestamp
    embed.timestamp = new Date().toISOString();

    // Add footer
    embed.footer = { text: 'Mitshe Workflow' };

    const payload = {
      username,
      embeds: [embed],
    };

    return this.sendToDiscord(webhookUrl, payload);
  }

  /**
   * Send payload to Discord webhook
   */
  private async sendToDiscord(
    webhookUrl: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
        throw new Error(`Discord webhook error (${response.status}): ${errorText}`);
      }

      logger.info('Discord message sent successfully');

      return {
        sent: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Discord message: ${errorMessage}`);
    }
  }
}
