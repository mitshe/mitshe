/**
 * AI Provider Adapter Registrations
 * Register all AI provider adapters with the registry
 */

import { aiProviderRegistry, AdapterConfig } from '../adapter-registry';
import { createClaudeAdapter } from '../ai-provider/claude.adapter';
import { createOpenAIAdapter } from '../ai-provider/openai.adapter';
import { createClaudeCodeLocalAdapter } from '../ai-provider/claude-code-local.adapter';

// Register Claude adapter
aiProviderRegistry.register('CLAUDE', (config: AdapterConfig) =>
  createClaudeAdapter({
    apiKey: config.apiKey || '',
    defaultModel: config.defaultModel,
  })
);

// Register OpenAI adapter
aiProviderRegistry.register('OPENAI', (config: AdapterConfig) =>
  createOpenAIAdapter({
    apiKey: config.apiKey || '',
    defaultModel: config.defaultModel || 'gpt-4-turbo-preview',
    baseUrl: config.baseUrl,
    organization: config.organization,
  })
);

// Register OpenRouter adapter (uses OpenAI-compatible endpoint)
aiProviderRegistry.register('OPENROUTER', (config: AdapterConfig) =>
  createOpenAIAdapter({
    apiKey: config.apiKey || '',
    defaultModel: config.defaultModel || 'anthropic/claude-3.5-sonnet',
    baseUrl: 'https://openrouter.ai/api/v1',
  })
);

// Register Gemini adapter (uses OpenAI-compatible endpoint)
aiProviderRegistry.register('GEMINI', (config: AdapterConfig) =>
  createOpenAIAdapter({
    apiKey: config.apiKey || '',
    defaultModel: config.defaultModel || 'google/gemini-pro-1.5',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  })
);

// Register Groq adapter (uses OpenAI-compatible endpoint)
aiProviderRegistry.register('GROQ', (config: AdapterConfig) =>
  createOpenAIAdapter({
    apiKey: config.apiKey || '',
    defaultModel: config.defaultModel || 'llama-3.1-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
  })
);

// Register Claude Code Local adapter
aiProviderRegistry.register('CLAUDE_CODE_LOCAL', () =>
  createClaudeCodeLocalAdapter()
);
