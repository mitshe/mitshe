/**
 * AI Executor Tests
 * Tests for AI summarize and translate actions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { executeAINode } from './ai.js';
import type { ExecutorContext } from './index.js';

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

describe('AI Executor', () => {
  let mockCtx: ExecutorContext;

  beforeEach(() => {
    mockCtx = {
      workingDir: '/tmp/test',
      credentials: {
        ai: {
          claude: 'test-claude-api-key',
          openai: 'test-openai-api-key',
          defaultProvider: 'claude',
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

  describe('executeAINode - action:ai_summarize', () => {
    it('should summarize content with Claude', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'This is a concise summary of the provided content.' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 100, output_tokens: 20 },
          }),
      });

      const config = {
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-claude-api-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );

      expect(result.summary).toBe('This is a concise summary of the provided content.');
      expect(result.provider).toBe('claude');
      expect(result.style).toBe('concise');
      expect(result.originalLength).toBeGreaterThan(0);
      expect(result.summaryLength).toBeGreaterThan(0);
      expect(result.usage).toEqual({ input_tokens: 100, output_tokens: 20 });
    });

    it('should use detailed style when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Detailed summary covering all key points...' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 150, output_tokens: 50 },
          }),
      });

      const config = {
        content: 'Content to summarize',
        style: 'detailed',
      };

      await executeAINode('action:ai_summarize', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toContain('detailed summary');
    });

    it('should use bullet-points style when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: '- Point 1\n- Point 2\n- Point 3' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 100, output_tokens: 30 },
          }),
      });

      const config = {
        content: 'Content to summarize',
        style: 'bullet-points',
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toContain('bullet points');
      expect(result.style).toBe('bullet-points');
    });

    it('should respect maxLength parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Short summary.' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 100, output_tokens: 10 },
          }),
      });

      const config = {
        content: 'Content to summarize',
        maxLength: 50,
      };

      await executeAINode('action:ai_summarize', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toContain('50 words');
      expect(body.max_tokens).toBe(100); // maxLength * 2, capped at 1000
    });

    it('should throw error when content is missing', async () => {
      const config = {};

      await expect(
        executeAINode('action:ai_summarize', config, mockCtx),
      ).rejects.toThrow('Content to summarize is required');
    });

    it('should use OpenAI when specified as provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'OpenAI summary' } }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 100, completion_tokens: 20 },
          }),
      });

      const config = {
        content: 'Content to summarize',
        provider: 'openai',
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object),
      );
      expect(result.provider).toBe('openai');
    });
  });

  describe('executeAINode - action:ai_translate', () => {
    it('should translate content to target language', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Hola, mundo!' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 50, output_tokens: 10 },
          }),
      });

      const config = {
        content: 'Hello, world!',
        targetLanguage: 'Spanish',
      };

      const result = await executeAINode('action:ai_translate', config, mockCtx);

      expect(result.translation).toBe('Hola, mundo!');
      expect(result.targetLanguage).toBe('Spanish');
      expect(result.sourceLanguage).toBe('auto-detect');
      expect(result.provider).toBe('claude');
    });

    it('should use specified source language', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Bonjour le monde!' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 50, output_tokens: 10 },
          }),
      });

      const config = {
        content: 'Hello, world!',
        targetLanguage: 'French',
        sourceLanguage: 'English',
      };

      const result = await executeAINode('action:ai_translate', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toContain('from English');
      expect(result.sourceLanguage).toBe('English');
    });

    it('should preserve formatting when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: '- Punto uno\n- Punto dos' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 50, output_tokens: 15 },
          }),
      });

      const config = {
        content: '- Point one\n- Point two',
        targetLanguage: 'Spanish',
        preserveFormatting: true,
      };

      await executeAINode('action:ai_translate', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toContain('Preserve all formatting');
    });

    it('should throw error when content is missing', async () => {
      const config = {
        targetLanguage: 'Spanish',
      };

      await expect(
        executeAINode('action:ai_translate', config, mockCtx),
      ).rejects.toThrow('Content to translate is required');
    });

    it('should throw error when target language is missing', async () => {
      const config = {
        content: 'Hello, world!',
      };

      await expect(
        executeAINode('action:ai_translate', config, mockCtx),
      ).rejects.toThrow('Target language is required');
    });
  });

  describe('executeAINode - action:ai_prompt', () => {
    it('should execute a simple prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'This is the AI response.' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 30, output_tokens: 10 },
          }),
      });

      const config = {
        prompt: 'What is 2+2?',
      };

      const result = await executeAINode('action:ai_prompt', config, mockCtx);

      expect(result.content).toBe('This is the AI response.');
      expect(result.provider).toBe('claude');
    });

    it('should include system prompt when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'Response with system context' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 50, output_tokens: 20 },
          }),
      });

      const config = {
        prompt: 'Hello',
        systemPrompt: 'You are a helpful assistant.',
      };

      await executeAINode('action:ai_prompt', config, mockCtx);

      const body = getMockBody();
      expect(body.system).toBe('You are a helpful assistant.');
    });

    it('should throw error when prompt is missing', async () => {
      const config = {};

      await expect(
        executeAINode('action:ai_prompt', config, mockCtx),
      ).rejects.toThrow('Prompt is required');
    });
  });

  describe('executeAINode - error handling', () => {
    it('should throw error on unknown AI action', async () => {
      const config = { prompt: 'test' };

      await expect(
        executeAINode('action:ai_unknown', config, mockCtx),
      ).rejects.toThrow('Unknown AI action: action:ai_unknown');
    });

    it('should throw error when no AI credentials configured', async () => {
      mockCtx.credentials.ai = {};

      const config = { content: 'Test', targetLanguage: 'Spanish' };

      await expect(
        executeAINode('action:ai_translate', config, mockCtx),
      ).rejects.toThrow('No AI provider credentials configured');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid API key'),
      });

      const config = {
        content: 'Test',
        targetLanguage: 'Spanish',
      };

      await expect(
        executeAINode('action:ai_translate', config, mockCtx),
      ).rejects.toThrow('Claude API error');
    });
  });

  describe('provider selection', () => {
    it('should use defaultProvider from credentials', async () => {
      mockCtx.credentials.ai.defaultProvider = 'openai';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'OpenAI response' } }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          }),
      });

      const config = {
        content: 'Test content',
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      expect(result.provider).toBe('openai');
    });

    it('should override defaultProvider with config provider', async () => {
      mockCtx.credentials.ai.defaultProvider = 'claude';
      mockCtx.credentials.ai.openai = 'test-openai-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'OpenAI response' } }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          }),
      });

      const config = {
        content: 'Test content',
        provider: 'openai',
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      expect(result.provider).toBe('openai');
    });

    it('should fallback to first available provider', async () => {
      mockCtx.credentials.ai = {
        groq: 'test-groq-key',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Groq response' } }],
            model: 'llama-3.3-70b-versatile',
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          }),
      });

      const config = {
        content: 'Test content',
      };

      const result = await executeAINode('action:ai_summarize', config, mockCtx);

      expect(result.provider).toBe('groq');
    });
  });
});
