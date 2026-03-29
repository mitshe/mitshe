/**
 * Discord Executor Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { DiscordExecutor } from './discord.executor.js';
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

describe('DiscordExecutor', () => {
  let executor: DiscordExecutor;
  let mockCtx: ExecutorContext;

  beforeEach(() => {
    executor = new DiscordExecutor();
    mockCtx = {
      workingDir: '/tmp/test',
      credentials: {
        ai: {},
        discord: {
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
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
    it('should support discord_message and discord_embed types', () => {
      expect(executor.supportedTypes).toContain('action:discord_message');
      expect(executor.supportedTypes).toContain('action:discord_embed');
    });
  });

  describe('execute - discord_message', () => {
    it('should send a simple text message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Hello from test!',
      };

      const result = await executor.execute(config, mockCtx);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = getMockBody();
      expect(body.content).toBe('Hello from test!');
      expect(body.username).toBe('Mitshe Bot');
      expect(result.sent).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should use custom username when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Custom bot message',
        username: 'Custom Bot',
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.username).toBe('Custom Bot');
    });

    it('should include avatar URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Message with avatar',
        avatarUrl: 'https://example.com/avatar.png',
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.avatar_url).toBe('https://example.com/avatar.png');
    });

    it('should use webhook URL from config over context', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Test',
        webhookUrl: 'https://discord.com/api/webhooks/custom/url',
      };

      await executor.execute(config, mockCtx);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/custom/url',
        expect.any(Object),
      );
    });

    it('should throw error when message is missing', async () => {
      const config = {
        _nodeType: 'action:discord_message',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Required field "message" is missing',
      );
    });

    it('should throw error when webhook URL is not configured', async () => {
      mockCtx.credentials.discord = undefined;

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Discord webhook URL not configured',
      );
    });
  });

  describe('execute - discord_embed', () => {
    it('should send an embed message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_embed',
        title: 'Test Embed',
        description: 'This is a test embed',
        color: 0x00ff00,
      };

      const result = await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect(body.embeds).toHaveLength(1);
      expect((body.embeds as unknown[])[0]).toMatchObject({ title: 'Test Embed' });
      const embed = (body.embeds as Record<string, unknown>[])[0];
      expect(embed.description).toBe('This is a test embed');
      expect(embed.color).toBe(0x00ff00);
      expect(embed.timestamp).toBeDefined();
      expect(embed.footer).toEqual({ text: 'Mitshe Workflow' });
      expect(result.sent).toBe(true);
    });

    it('should include URL in embed when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const config = {
        _nodeType: 'action:discord_embed',
        title: 'Click Me',
        url: 'https://example.com',
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect((body.embeds as Record<string, unknown>[])[0].url).toBe('https://example.com');
    });

    it('should include fields in embed when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const fields = [
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: false },
      ];

      const config = {
        _nodeType: 'action:discord_embed',
        title: 'Embed with Fields',
        fields,
      };

      await executor.execute(config, mockCtx);

      const body = getMockBody();
      expect((body.embeds as Record<string, unknown>[])[0].fields).toEqual(fields);
    });
  });

  describe('error handling', () => {
    it('should throw error on Discord API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request: invalid webhook'),
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Discord webhook error (400): Bad Request: invalid webhook',
      );
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Failed to send Discord message: Network error',
      );
    });

    it('should throw error on rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('You are being rate limited'),
      });

      const config = {
        _nodeType: 'action:discord_message',
        message: 'Test',
      };

      await expect(executor.execute(config, mockCtx)).rejects.toThrow(
        'Discord webhook error (429): You are being rate limited',
      );
    });
  });
});
