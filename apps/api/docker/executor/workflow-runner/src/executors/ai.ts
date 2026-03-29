/**
 * AI Node Executors
 * Handles AI prompt, chat, code generation using multiple providers
 * Supports: Claude, OpenAI, OpenRouter, Gemini, Groq
 */

import type { ExecutorContext } from './index.js';
import type { AIProviderType } from '../types.js';
import { logger } from '../logger.js';

// API endpoints for each provider
const API_ENDPOINTS: Record<AIProviderType, string> = {
  claude: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
};

// Default models for each provider
const DEFAULT_MODELS: Record<AIProviderType, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-sonnet-4', // Via OpenRouter
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
};

export async function executeAINode(
  type: string,
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'action:ai_prompt':
      return executeAIPrompt(config, ctx);

    case 'action:ai_code_task':
    case 'action:claude_code':
      return executeAICodeTask(config, ctx);

    case 'action:ai_analyze':
      return executeAIAnalyze(config, ctx);

    case 'action:ai_chat':
      return executeAIChat(config, ctx);

    case 'action:ai_summarize':
      return executeAISummarize(config, ctx);

    case 'action:ai_translate':
      return executeAITranslate(config, ctx);

    default:
      throw new Error(`Unknown AI action: ${type}`);
  }
}

/**
 * Get provider from config or use default
 */
function getProvider(config: Record<string, unknown>, ctx: ExecutorContext): AIProviderType {
  // Check config first
  if (config.provider && typeof config.provider === 'string') {
    return config.provider as AIProviderType;
  }

  // Use default provider from credentials
  if (ctx.credentials.ai.defaultProvider) {
    return ctx.credentials.ai.defaultProvider;
  }

  // Fallback to first available
  const available = Object.keys(ctx.credentials.ai).filter(k =>
    k !== 'defaultProvider' && ctx.credentials.ai[k as keyof typeof ctx.credentials.ai]
  ) as AIProviderType[];

  if (available.length === 0) {
    throw new Error('No AI provider credentials configured');
  }

  return available[0];
}

/**
 * Get API key for provider
 */
function getApiKey(provider: AIProviderType, ctx: ExecutorContext): string {
  const key = ctx.credentials.ai[provider];
  if (!key) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }
  return key;
}

/**
 * Execute AI prompt
 */
async function executeAIPrompt(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const prompt = config.prompt as string;
  const systemPrompt = config.systemPrompt as string;

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  logger.info(`Executing AI prompt with ${provider} (${model})`);

  const result = await callAI(provider, {
    model,
    systemPrompt,
    userPrompt: prompt,
    apiKey: getApiKey(provider, ctx),
  });

  return {
    content: result.content,
    model: result.model,
    provider,
    usage: result.usage,
  };
}

/**
 * Execute AI code task
 */
async function executeAICodeTask(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const task = (config.task || config.prompt) as string;

  if (!task) {
    throw new Error('Task or prompt is required');
  }

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  // Build detailed prompt for code generation
  let systemPrompt = `You are an expert software developer. Generate code based on the task description.
You MUST output all files using EXACTLY this format:

--- FILE: path/to/file.ext ---
file content goes here
--- END FILE ---

Always include complete, working code. Do not use placeholders or TODO comments.`;

  let userPrompt = `# Task\n\n${task}`;

  // Add repository context if available
  if (ctx.workflowContext.repositoryName) {
    userPrompt += `\n\n# Repository Context\nRepository: ${ctx.workflowContext.repositoryName}`;
    if (ctx.workflowContext.branch) {
      userPrompt += `\nBranch: ${ctx.workflowContext.branch}`;
    }
  }

  userPrompt += '\n\nNow implement the task and output the files:';

  logger.info(`Executing AI code task with ${provider}: ${task.substring(0, 100)}...`);

  const result = await callAI(provider, {
    model,
    systemPrompt,
    userPrompt,
    apiKey: getApiKey(provider, ctx),
    maxTokens: 8192, // Allow longer responses for code
  });

  const files = parseFilesFromResponse(result.content);

  // Store files in workflow context
  if (files.length > 0) {
    ctx.workflowContext.files = files;
    logger.info(`Generated ${files.length} files: ${files.map(f => f.path).join(', ')}`);
  }

  return {
    content: result.content,
    files,
    provider,
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Execute AI analysis
 */
async function executeAIAnalyze(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const content = config.content as string;
  const schema = config.schema as string;

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  const systemPrompt = 'You are an analytical AI. Provide structured analysis in JSON format.';
  const userPrompt = `Analyze the following content and provide insights:

${content}

Provide your analysis in JSON format with the following structure:
${schema || '{"summary": "string", "insights": ["string"], "recommendations": ["string"]}'}`;

  const result = await callAI(provider, {
    model,
    systemPrompt,
    userPrompt,
    apiKey: getApiKey(provider, ctx),
  });

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { analysis: JSON.parse(jsonMatch[0]), provider };
    }
  } catch {
    // Fall back to raw response
  }

  return { analysis: result.content, provider };
}

/**
 * Execute AI chat (multi-turn)
 */
async function executeAIChat(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const messages = config.messages as Array<{ role: string; content: string }>;
  const systemPrompt = config.systemPrompt as string;

  if (!messages || messages.length === 0) {
    throw new Error('Messages array is required');
  }

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  logger.info(`Executing AI chat with ${provider} (${messages.length} messages)`);

  const result = await callAIChat(provider, {
    model,
    systemPrompt,
    messages,
    apiKey: getApiKey(provider, ctx),
  });

  return {
    content: result.content,
    provider,
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Execute AI summarize
 */
async function executeAISummarize(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const content = config.content as string;
  const maxLength = (config.maxLength as number) || 200;
  const style = (config.style as string) || 'concise'; // concise, detailed, bullet-points

  if (!content) {
    throw new Error('Content to summarize is required');
  }

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  let styleInstruction = '';
  switch (style) {
    case 'detailed':
      styleInstruction = 'Provide a detailed summary covering all key points.';
      break;
    case 'bullet-points':
      styleInstruction = 'Summarize using bullet points for easy scanning.';
      break;
    default:
      styleInstruction = 'Provide a concise summary in 2-3 sentences.';
  }

  const systemPrompt = `You are a summarization expert. ${styleInstruction} Keep the summary under ${maxLength} words.`;
  const userPrompt = `Summarize the following content:\n\n${content}`;

  logger.info(`Executing AI summarize with ${provider}`);

  const result = await callAI(provider, {
    model,
    systemPrompt,
    userPrompt,
    apiKey: getApiKey(provider, ctx),
    maxTokens: Math.min(maxLength * 2, 1000),
  });

  return {
    summary: result.content,
    originalLength: content.length,
    summaryLength: result.content.length,
    style,
    provider,
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Execute AI translate
 */
async function executeAITranslate(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const content = config.content as string;
  const targetLanguage = config.targetLanguage as string;
  const sourceLanguage = (config.sourceLanguage as string) || 'auto-detect';
  const preserveFormatting = config.preserveFormatting !== false;

  if (!content) {
    throw new Error('Content to translate is required');
  }

  if (!targetLanguage) {
    throw new Error('Target language is required');
  }

  const provider = getProvider(config, ctx);
  const model = (config.model as string) || DEFAULT_MODELS[provider];

  const systemPrompt = `You are a professional translator. Translate the text ${
    sourceLanguage === 'auto-detect' ? 'from its original language' : `from ${sourceLanguage}`
  } to ${targetLanguage}. ${
    preserveFormatting ? 'Preserve all formatting, line breaks, and structure.' : ''
  } Only output the translation, no explanations.`;

  const userPrompt = content;

  logger.info(`Executing AI translate to ${targetLanguage} with ${provider}`);

  const result = await callAI(provider, {
    model,
    systemPrompt,
    userPrompt,
    apiKey: getApiKey(provider, ctx),
  });

  return {
    translation: result.content,
    sourceLanguage,
    targetLanguage,
    provider,
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Universal AI API call
 */
interface AICallOptions {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  apiKey: string;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

async function callAI(provider: AIProviderType, options: AICallOptions): Promise<AIResponse> {
  const { model, systemPrompt, userPrompt, apiKey, maxTokens = 4096 } = options;
  const endpoint = API_ENDPOINTS[provider];

  // Build request based on provider
  if (provider === 'claude') {
    return callClaudeAPI(endpoint, model, systemPrompt, userPrompt, apiKey, maxTokens);
  } else if (provider === 'gemini') {
    return callGeminiAPI(endpoint, userPrompt, apiKey, systemPrompt);
  } else {
    // OpenAI-compatible (OpenAI, OpenRouter, Groq)
    return callOpenAICompatibleAPI(provider, endpoint, model, systemPrompt, userPrompt, apiKey, maxTokens);
  }
}

/**
 * Call Claude API (Anthropic format)
 */
async function callClaudeAPI(
  endpoint: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  apiKey: string,
  maxTokens: number,
): Promise<AIResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ text: string }>;
    model: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  return {
    content: data.content[0]?.text || '',
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Call OpenAI-compatible API (OpenAI, OpenRouter, Groq)
 */
async function callOpenAICompatibleAPI(
  provider: AIProviderType,
  endpoint: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  apiKey: string,
  maxTokens: number,
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter requires additional headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://mitshe.com';
    headers['X-Title'] = 'Mitshe Workflow';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${provider} API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    usage: data.usage ? {
      input_tokens: data.usage.prompt_tokens,
      output_tokens: data.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Call Gemini API (Google format)
 */
async function callGeminiAPI(
  endpoint: string,
  userPrompt: string,
  apiKey: string,
  systemPrompt?: string,
): Promise<AIResponse> {
  const fullEndpoint = `${endpoint}?key=${apiKey}`;

  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: userPrompt }] });

  const response = await fetch(fullEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  return {
    content: data.candidates[0]?.content?.parts[0]?.text || '',
    model: 'gemini-2.0-flash',
  };
}

/**
 * Call AI with chat messages
 */
interface AIChatOptions {
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  maxTokens?: number;
}

async function callAIChat(provider: AIProviderType, options: AIChatOptions): Promise<AIResponse> {
  const { model, systemPrompt, messages, apiKey, maxTokens = 4096 } = options;
  const endpoint = API_ENDPOINTS[provider];

  if (provider === 'claude') {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      content: Array<{ text: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: data.usage,
    };
  } else {
    // OpenAI-compatible
    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://mitshe.com';
      headers['X-Title'] = 'Mitshe Workflow';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: allMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        input_tokens: data.usage.prompt_tokens,
        output_tokens: data.usage.completion_tokens,
      } : undefined,
    };
  }
}

/**
 * Parse files from AI response
 */
function parseFilesFromResponse(content: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const fileRegex = /---\s*FILE:\s*(.+?)\s*---\n([\s\S]*?)---\s*END FILE\s*---/g;

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return files;
}
