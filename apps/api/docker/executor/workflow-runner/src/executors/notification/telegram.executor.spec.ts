/**
 * Telegram Executor Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { TelegramExecutor } from './telegram.executor.js';
import type { ExecutorContext } from '../base.js';

// Mock fetch globally - use any type for simplicity in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn<any>();
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to get request body from mock calls
function getMockBody(callIndex = 0): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = mockFetch.mock.calls[callIndex] as any;
  return JSON.parse(call[1].body as string);
}

describe('TelegramExecutor', () => {
  let executor: TelegramExecutor;
  let mockCtx: ExecutorContext;

  beforeEach(() => {
    executor = new TelegramExecutor();
    mockCtx = {
      workingDir: '/tmp/test',
      credentials: {
        ai: {},
        telegram: {
          botToken: 'test-bot-token-123',
          defaultChatId: '-1001234567890',
        },
      },
      expressionContext: {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {},
        env: {},
      },
      nodeOutputs: {},
      workflowContext: {},
    };

    mockFetch.mockReset();
  });

  describe('supportedTypes', () => {
    it('should support telegram_message type', () => {
      expect(executor.supportedTypes).toContain('action:telegram_message');
    });
  });

  describe('execute - telegram_message', () => {
    it('should send a simple text message', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12345 },
          }),
      });

      const config = {
        message: 'Hello from test!',
      };

      const result = await executor.execute(config, mockCtx);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token-123/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = getMockBody();
      expect(body.chat_id).toBe('-1001234567890');
      expect(body.text).toBe('Hello from test!');
      expect(body.parse_mode).toBe('HTML');
      expect(result.sent).toBe(true);
      expect(result.messageId).toBe(12345);
      expect(result.chatId).toBe('-1001234567890');
      expect(result.timestamp).toBeDefined();
    });

    it('should use custom chat ID when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12346 },
          }),
      });

      const config = {
        message: 'Custom chat message',
        chatId: '-1009999999999',
      };

      const result = await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.chat_id).toBe('-1009999999999');
      expect(result.chatId).toBe('-1009999999999');
    });

    it('should use custom bot token from config', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12347 },
          }),
      });

      const config = {
        message: 'Test',
        botToken: 'custom-bot-token',
      };

      await executor.execute(config, mockCtx);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botcustom-bot-token/sendMessage',
        expect.any(Object),
      );
    });

    it('should use Markdown parse mode when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12348 },
          }),
      });

      const config = {
        message: '*Bold* text',
        parseMode: 'Markdown',
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.parse_mode).toBe('Markdown');
    });

    it('should disable notification when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12349 },
          }),
      });

      const config = {
        message: 'Silent message',
        disableNotification: true,
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.disable_notification).toBe(true);
    });

    it('should disable link preview when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { message_id: 12350 },
          }),
      });

      const config = {
        message: 'Check out https://example.com',
        disableLinkPreview: true,
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.disable_web_page_preview).toBe(true);
    });

    it('should throw error when message is missing', async () => {
      const config = {};

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Required field "message" is missing',
      );
    });

    it('should throw error when bot token is not configured', async () => {
      mockCtx.credentials.telegram = undefined;

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Telegram bot token not configured',
      );
    });

    it('should throw error when chat ID is not configured', async () => {
      mockCtx.credentials.telegram = {
        botToken: 'test-token',
      };

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Telegram chat ID is required',
      );
    });
  });

  describe('error handling', () => {
    it('should throw error on Telegram API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: false,
            description: 'Bad Request: chat not found',
          }),
      });

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Telegram API error: Bad Request: chat not found',
      );
    });

    it('should throw error on unauthorized bot token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: false,
            description: 'Unauthorized',
          }),
      });

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Telegram API error: Unauthorized',
      );
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Failed to send Telegram message: Network error',
      );
    });

    it('should handle unknown error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            ok: false,
          }),
      });

      const config = {
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Telegram API error: Unknown error',
      );
    });
  });
});
