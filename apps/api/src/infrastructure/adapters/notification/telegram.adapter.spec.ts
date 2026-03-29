import { TelegramAdapter, createTelegramAdapter } from './telegram.adapter';

describe('TelegramAdapter', () => {
  const validBotToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  describe('constructor and configuration', () => {
    it('should create adapter with valid config', () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
      });
      expect(adapter).toBeDefined();
      expect(adapter.getProviderType()).toBe('telegram');
      expect(adapter.getProviderName()).toBe('Telegram');
    });

    it('should accept optional defaultChatId', () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });
      expect(adapter).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return true for valid bot token', async () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
      });
      expect(await adapter.isConfigured()).toBe(true);
    });

    it('should return false for empty bot token', async () => {
      const adapter = new TelegramAdapter({
        botToken: '',
      });
      expect(await adapter.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should fail for empty bot token', async () => {
      const adapter = new TelegramAdapter({ botToken: '' });
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail for invalid bot token format', async () => {
      const adapter = new TelegramAdapter({
        botToken: 'invalid-token-without-colon',
      });
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid bot token format');
    });
  });

  describe('factory function', () => {
    it('should create adapter via factory', () => {
      const adapter = createTelegramAdapter({
        botToken: validBotToken,
      });
      expect(adapter).toBeInstanceOf(TelegramAdapter);
      expect(adapter.getProviderType()).toBe('telegram');
    });

    it('should pass defaultChatId through factory', () => {
      const adapter = createTelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });
      expect(adapter).toBeDefined();
    });
  });

  describe('send', () => {
    let adapter: TelegramAdapter;

    beforeEach(() => {
      adapter = new TelegramAdapter({
        botToken: validBotToken,
      });
    });

    it('should fail when no chatId provided and no default set', async () => {
      const recipient = { type: 'channel' as const, id: '' };
      const message = { title: 'Test', body: 'Body' };

      const result = await adapter.send(recipient, message);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No chat ID');
    });

    it('should use defaultChatId when recipient id is empty', async () => {
      const adapterWithDefault = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });

      const recipient = { type: 'channel' as const, id: '' };
      const message = { title: 'Test', body: 'Body' };

      // Will fail due to invalid token, but should not fail on missing chatId
      const result = await adapterWithDefault.send(recipient, message);
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('No chat ID');
    });
  });

  describe('sendBatch', () => {
    it('should send to all recipients', async () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });

      const recipients = [
        { type: 'channel' as const, id: '-1001111111111' },
        { type: 'channel' as const, id: '-1002222222222' },
      ];
      const message = { title: 'Test', body: 'Body' };

      const results = await adapter.sendBatch(recipients, message);
      expect(results).toHaveLength(2);
    });
  });

  describe('message formatting', () => {
    it('should handle all severity types', async () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });

      const severities = ['info', 'success', 'warning', 'error'] as const;

      for (const severity of severities) {
        const message = {
          title: `Test ${severity}`,
          body: 'Test body',
          severity,
        };

        const recipient = { type: 'channel' as const, id: '-1001234567890' };
        const result = await adapter.send(recipient, message);
        // Just verify it doesn't throw
        expect(result).toBeDefined();
      }
    });

    it('should handle message with attachments', async () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });

      const message = {
        title: 'Test with code',
        body: 'Check this code',
        attachments: [
          {
            type: 'code' as const,
            title: 'Example',
            content: 'function test() { return true; }',
            language: 'javascript',
          },
        ],
      };

      const recipient = { type: 'channel' as const, id: '-1001234567890' };
      const result = await adapter.send(recipient, message);
      expect(result).toBeDefined();
    });

    it('should handle message with metadata', async () => {
      const adapter = new TelegramAdapter({
        botToken: validBotToken,
        defaultChatId: '-1001234567890',
      });

      const message = {
        title: 'Test with metadata',
        body: 'Check details below',
        metadata: {
          Version: '1.0.0',
          Environment: 'production',
          Author: 'System',
        },
      };

      const recipient = { type: 'channel' as const, id: '-1001234567890' };
      const result = await adapter.send(recipient, message);
      expect(result).toBeDefined();
    });
  });
});
