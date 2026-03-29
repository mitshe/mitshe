/**
 * Base Executor Interface
 * All node executors must implement this interface
 */

import type {
  WorkflowNode,
  AICredentials,
  SlackCredentials,
  DiscordCredentials,
  TelegramCredentials,
} from '../types.js';
import type { ExpressionContext } from '../expression.js';

/**
 * Executor context - shared state for workflow execution
 */
export interface ExecutorContext {
  workingDir: string;
  credentials: {
    ai: AICredentials;
    gitToken?: string;
    gitProvider?: 'github' | 'gitlab';
    slack?: SlackCredentials;
    discord?: DiscordCredentials;
    telegram?: TelegramCredentials;
  };
  expressionContext: ExpressionContext;
  nodeOutputs: Record<string, Record<string, unknown>>;
  workflowContext: Record<string, unknown>;
}

/**
 * Base interface for all executors
 */
export interface IExecutor {
  /**
   * Node types this executor handles
   */
  readonly supportedTypes: string[];

  /**
   * Execute the node
   */
  execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>>;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseExecutor implements IExecutor {
  abstract readonly supportedTypes: string[];

  abstract execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>>;

  /**
   * Validate required config fields
   */
  protected validateRequired(
    config: Record<string, unknown>,
    fields: string[],
  ): void {
    for (const field of fields) {
      if (config[field] === undefined || config[field] === null || config[field] === '') {
        throw new Error(`Required field "${field}" is missing`);
      }
    }
  }

  /**
   * Get string value from config with default
   */
  protected getString(
    config: Record<string, unknown>,
    key: string,
    defaultValue?: string,
  ): string {
    const value = config[key];
    if (value === undefined || value === null) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Required field "${key}" is missing`);
    }
    return String(value);
  }

  /**
   * Get optional string value from config
   */
  protected getOptionalString(
    config: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = config[key];
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  /**
   * Get boolean value from config with default
   */
  protected getBoolean(
    config: Record<string, unknown>,
    key: string,
    defaultValue: boolean,
  ): boolean {
    const value = config[key];
    if (value === undefined || value === null) return defaultValue;
    return Boolean(value);
  }

  /**
   * Set workflow context variable (accessible via ctx.* in expressions)
   */
  protected setContext(
    ctx: ExecutorContext,
    key: string,
    value: unknown,
  ): void {
    ctx.workflowContext[key] = value;
  }
}
