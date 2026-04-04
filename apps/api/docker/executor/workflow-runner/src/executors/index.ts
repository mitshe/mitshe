/**
 * Node Executors Registry
 * Central registry for all node type executors
 */

import type { WorkflowNode, AICredentials } from '../types.js';
import type { ExpressionContext } from '../expression.js';
import type { IExecutor, ExecutorContext } from './base.js';

// Import all executors
import {
  GitCloneExecutor,
  GitBranchExecutor,
  GitCommitExecutor,
  GitPushExecutor,
  GitMergeRequestExecutor,
} from './git/index.js';

import {
  SlackExecutor,
  WebhookExecutor,
  DiscordExecutor,
  TelegramExecutor,
} from './notification/index.js';

import { SessionExecutor } from './session/session.executor.js';

// Legacy executors (to be refactored later)
import { executeAINode } from './ai.js';
import { executeShellNode } from './shell.js';
import { executeHttpNode } from './http.js';
import { executeControlNode } from './control.js';
import { executeTransformNode } from './transform.js';

// Re-export ExecutorContext for compatibility
export type { ExecutorContext } from './base.js';

/**
 * Executor Registry
 * Maps node types to their executors
 */
class ExecutorRegistry {
  private executors: Map<string, IExecutor> = new Map();

  constructor() {
    this.registerExecutors();
  }

  /**
   * Register all available executors
   */
  private registerExecutors(): void {
    const executorInstances: IExecutor[] = [
      // Git executors
      new GitCloneExecutor(),
      new GitBranchExecutor(),
      new GitCommitExecutor(),
      new GitPushExecutor(),
      new GitMergeRequestExecutor(),

      // Notification executors
      new SlackExecutor(),
      new WebhookExecutor(),
      new DiscordExecutor(),
      new TelegramExecutor(),

      // Session executors
      new SessionExecutor(),
    ];

    // Register each executor for its supported types
    for (const executor of executorInstances) {
      for (const type of executor.supportedTypes) {
        this.executors.set(type, executor);
      }
    }
  }

  /**
   * Get executor for a node type
   */
  getExecutor(type: string): IExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * Check if a type has a registered executor
   */
  hasExecutor(type: string): boolean {
    return this.executors.has(type);
  }
}

// Singleton registry
const registry = new ExecutorRegistry();

/**
 * Execute a workflow node
 */
export async function executeNode(
  node: WorkflowNode,
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  const { type } = node;

  // Triggers just pass through
  if (type.startsWith('trigger:')) {
    return { triggered: true };
  }

  // Check registry for new-style executors
  const executor = registry.getExecutor(type);
  if (executor) {
    return executor.execute(config, ctx);
  }

  // Legacy executors (fallback)

  // AI nodes
  if (type.startsWith('action:ai_') || type === 'action:claude_code') {
    return executeAINode(type, config, ctx);
  }

  // Shell/Docker nodes
  if (type.startsWith('action:shell_') || type.startsWith('action:docker_')) {
    return executeShellNode(type, config, ctx);
  }

  // HTTP nodes
  if (type === 'utility:http_request') {
    return executeHttpNode(type, config, ctx);
  }

  // Control flow
  if (type.startsWith('control:')) {
    return executeControlNode(type, config, ctx);
  }

  // Transform nodes
  if (type.startsWith('transform:')) {
    return executeTransformNode(type, config, ctx);
  }

  // Utility script
  if (type === 'utility:script') {
    return executeScriptNode(config, ctx);
  }

  throw new Error(`Unknown node type: ${type}`);
}

/**
 * Execute JavaScript expression in sandboxed context
 * Script outputs are automatically added to workflow context (ctx.*)
 */
function executeScriptNode(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Record<string, unknown> {
  const expression = config.expression as string;

  if (!expression) {
    throw new Error('Script expression is required');
  }

  // Filter env vars - exclude known internal secrets only
  const sensitiveKeys = new Set([
    'WORKFLOW_JOB', 'SESSION_CONFIG', 'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY', 'ENCRYPTION_KEY', 'JWT_SECRET',
    'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'API_TOKEN',
    'XAI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY',
    'CUSTOM_API_KEY', 'SENTRY_DSN',
  ]);
  const safeEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v && !sensitiveKeys.has(k)) {
      safeEnv[k] = v;
    }
  }

  const scriptContext = {
    ...ctx.expressionContext.trigger,
    vars: ctx.expressionContext.vars,
    nodes: ctx.expressionContext.nodes,
    ctx: ctx.workflowContext,
    env: safeEnv,
  };

  try {
    const fn = new Function(
      ...Object.keys(scriptContext),
      `"use strict"; return (${expression});`,
    );
    const result = fn(...Object.values(scriptContext));

    if (result && typeof result === 'object' && !Array.isArray(result)) {
      // Also set result values in workflow context for easy access via ctx.*
      for (const [key, value] of Object.entries(result)) {
        ctx.workflowContext[key] = value;
      }
      return result;
    }
    return { result };
  } catch (error) {
    throw new Error(`Script execution failed: ${(error as Error).message}`);
  }
}
