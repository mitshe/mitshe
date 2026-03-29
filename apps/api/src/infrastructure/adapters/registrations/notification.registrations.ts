/**
 * Notification Adapter Registrations
 * Register all notification adapters with the registry
 */

import { notificationRegistry, AdapterConfig } from '../adapter-registry';
import { createSlackAdapter, createSlackWebhookAdapter } from '../notification/slack.adapter';
import { createDiscordAdapter } from '../notification/discord.adapter';
import { createTelegramAdapter } from '../notification/telegram.adapter';

// Register Slack adapter (handles both webhook and bot token)
notificationRegistry.register('SLACK', (config: AdapterConfig) => {
  if (config.webhookUrl) {
    return createSlackWebhookAdapter({
      webhookUrl: config.webhookUrl,
    });
  }
  return createSlackAdapter({
    botToken: config.botToken || config.accessToken || '',
    botName: config.botName,
    iconEmoji: config.iconEmoji,
  });
});

// Register Discord adapter
notificationRegistry.register('DISCORD', (config: AdapterConfig) =>
  createDiscordAdapter({
    webhookUrl: config.webhookUrl || '',
    username: config.username as string | undefined,
    avatarUrl: config.avatarUrl as string | undefined,
  })
);

// Register Telegram adapter
notificationRegistry.register('TELEGRAM', (config: AdapterConfig) =>
  createTelegramAdapter({
    botToken: config.botToken || config.accessToken || '',
    defaultChatId: config.defaultChatId as string | undefined,
  })
);

// Teams adapter placeholder - to be implemented
notificationRegistry.register('TEAMS', () => {
  throw new Error('Teams adapter not implemented yet');
});
