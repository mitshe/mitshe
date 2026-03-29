/**
 * Telegram Notification Executor
 * Handles: action:telegram_message
 *
 * Uses Telegram Bot API for sending messages
 * https://core.telegram.org/bots/api
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { logger } from '../../logger.js';

export class TelegramExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:telegram_message'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const botToken =
      this.getOptionalString(config, 'botToken') ||
      ctx.credentials.telegram?.botToken;

    if (!botToken) {
      throw new Error(
        'Telegram bot token not configured. ' +
        'Add Telegram integration in Settings → Integrations.',
      );
    }

    const chatId =
      this.getOptionalString(config, 'chatId') ||
      ctx.credentials.telegram?.defaultChatId;

    if (!chatId) {
      throw new Error(
        'Telegram chat ID is required. ' +
        'Provide chatId in node config or set defaultChatId in Telegram integration.',
      );
    }

    const message = this.getString(config, 'message');
    const parseMode = this.getOptionalString(config, 'parseMode') || 'HTML';
    const disableNotification = config.disableNotification === true;
    const disableLinkPreview = config.disableLinkPreview === true;

    logger.info(`Sending Telegram message to chat ${chatId}`);

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
    };

    if (disableNotification) {
      payload.disable_notification = true;
    }

    if (disableLinkPreview) {
      payload.disable_web_page_preview = true;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        ok: boolean;
        result?: { message_id: number };
        description?: string;
      };

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
      }

      logger.info(`Telegram message sent successfully, message_id: ${data.result?.message_id}`);

      return {
        sent: true,
        messageId: data.result?.message_id,
        chatId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Telegram message: ${errorMessage}`);
    }
  }
}
