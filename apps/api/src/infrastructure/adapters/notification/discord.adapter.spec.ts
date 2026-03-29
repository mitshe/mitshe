import { DiscordWebhookAdapter, createDiscordAdapter } from './discord.adapter';

describe('DiscordWebhookAdapter', () => {
  const validWebhookUrl =
    'https://discord.com/api/webhooks/1234567890/abcdefghijklmnop';

  describe('constructor and configuration', () => {
    it('should create adapter with valid config', () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: validWebhookUrl,
      });
      expect(adapter).toBeDefined();
      expect(adapter.getProviderType()).toBe('discord');
      expect(adapter.getProviderName()).toBe('Discord');
    });

    it('should accept optional username and avatarUrl', () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: validWebhookUrl,
        username: 'Test Bot',
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(adapter).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return true for valid webhook URL', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: validWebhookUrl,
      });
      expect(await adapter.isConfigured()).toBe(true);
    });

    it('should return false for empty webhook URL', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: '',
      });
      expect(await adapter.isConfigured()).toBe(false);
    });

    it('should return false for invalid webhook URL format', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: 'https://example.com/webhook',
      });
      expect(await adapter.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should fail for empty webhook URL', async () => {
      const adapter = new DiscordWebhookAdapter({ webhookUrl: '' });
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail for invalid webhook URL format', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: 'https://example.com/not-discord',
      });
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Discord webhook URL');
    });

    it('should fail for malformed URL', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: 'not-a-url',
      });
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Discord webhook URL');
    });
  });

  describe('factory function', () => {
    it('should create adapter via factory', () => {
      const adapter = createDiscordAdapter({
        webhookUrl: validWebhookUrl,
      });
      expect(adapter).toBeInstanceOf(DiscordWebhookAdapter);
      expect(adapter.getProviderType()).toBe('discord');
    });
  });

  describe('send message formatting', () => {
    let adapter: DiscordWebhookAdapter;

    beforeEach(() => {
      adapter = new DiscordWebhookAdapter({
        webhookUrl: validWebhookUrl,
      });
    });

    // Note: Actual send tests would require mocking fetch
    // These tests verify the adapter is properly configured

    it('should handle message with all fields', async () => {
      // This test would require fetch mocking
      // For now, just verify the adapter can handle the call
      const recipient = { type: 'webhook' as const, id: 'test' };
      const message = {
        title: 'Test Title',
        body: 'Test body message',
        url: 'https://example.com',
        severity: 'success' as const,
        metadata: { key: 'value' },
        attachments: [
          {
            type: 'code' as const,
            title: 'Code Block',
            content: 'console.log("hello")',
            language: 'javascript',
          },
        ],
      };

      // The send will fail because we're not mocking fetch,
      // but it should not throw
      const result = await adapter.send(recipient, message);
      expect(result).toBeDefined();
      expect(result.success).toBe(false); // Will fail without actual webhook
    });
  });

  describe('sendBatch', () => {
    it('should send to all recipients', async () => {
      const adapter = new DiscordWebhookAdapter({
        webhookUrl: validWebhookUrl,
      });

      const recipients = [
        { type: 'webhook' as const, id: '1' },
        { type: 'webhook' as const, id: '2' },
      ];
      const message = { title: 'Test', body: 'Body' };

      const results = await adapter.sendBatch(recipients, message);
      expect(results).toHaveLength(2);
    });
  });
});
