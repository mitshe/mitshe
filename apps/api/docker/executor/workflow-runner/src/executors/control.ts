/**
 * Control Flow Node Executors
 * Handles conditions, loops, parallel execution
 */

import type { ExecutorContext } from './index.js';
import { evaluateCondition } from '../expression.js';

export async function executeControlNode(
  type: string,
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'control:condition':
      return executeCondition(config, ctx);

    case 'control:switch':
      return executeSwitch(config, ctx);

    case 'control:delay':
      return executeDelay(config);

    case 'control:parallel':
      return executeParallel(config, ctx);

    case 'control:merge':
      return executeMerge(config, ctx);

    default:
      throw new Error(`Unknown control action: ${type}`);
  }
}

/**
 * Evaluate condition and return which branch to take
 */
function executeCondition(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Record<string, unknown> {
  const condition = config.condition as string;

  if (!condition) {
    throw new Error('Condition is required');
  }

  const result = evaluateCondition(condition, ctx.expressionContext);

  return {
    result,
    branch: result ? 'true' : 'false',
  };
}

/**
 * Switch/case statement
 */
function executeSwitch(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Record<string, unknown> {
  const value = config.value as string;
  const cases = config.cases as Record<string, string>;

  if (!value) {
    throw new Error('Switch value is required');
  }

  // Evaluate the value expression
  const evaluated = evaluateCondition(value, ctx.expressionContext);
  const stringValue = String(evaluated);

  // Find matching case
  const matchedCase = cases?.[stringValue] || cases?.['default'] || 'default';

  return {
    value: stringValue,
    matchedCase,
  };
}

/**
 * Delay execution
 */
async function executeDelay(
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ms = (config.milliseconds as number) || (config.seconds as number) * 1000 || 1000;

  await new Promise((resolve) => setTimeout(resolve, ms));

  return {
    delayed: true,
    milliseconds: ms,
  };
}

/**
 * Parallel fork - signals that downstream nodes should run in parallel
 * This is a pass-through node; the actual parallelism is handled by the runner
 * when it detects multiple outgoing edges from this node
 */
function executeParallel(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Record<string, unknown> {
  // Pass through input data to all branches
  // The 'branches' config can specify which outputs to send to each branch
  const branches = config.branches as string[] | undefined;
  const input = config.input as Record<string, unknown> | undefined;

  // If specific branches are defined, include them in output for documentation
  const output: Record<string, unknown> = {
    type: 'parallel_fork',
    branches: branches || ['default'],
    timestamp: new Date().toISOString(),
  };

  // Pass through any input data
  if (input) {
    output.data = input;
  }

  // Also pass through any node outputs referenced in config
  if (config.passthrough) {
    const passthroughRefs = config.passthrough as string[];
    for (const ref of passthroughRefs) {
      const value = ctx.nodeOutputs[ref];
      if (value !== undefined) {
        output[ref] = value;
      }
    }
  }

  return output;
}

/**
 * Merge/join - collects outputs from parallel branches
 * This node waits for all incoming edges (handled by runner)
 * and merges the outputs from all source nodes
 */
function executeMerge(
  config: Record<string, unknown>,
  ctx: ExecutorContext,
): Record<string, unknown> {
  // Collect outputs from source nodes
  const sourceNodes = config.sources as string[] | undefined;
  const mergeStrategy = (config.strategy as string) || 'collect';

  const merged: Record<string, unknown> = {
    type: 'parallel_merge',
    strategy: mergeStrategy,
    timestamp: new Date().toISOString(),
  };

  // If specific sources are defined, collect their outputs
  if (sourceNodes) {
    const collected: Record<string, unknown>[] = [];
    for (const nodeId of sourceNodes) {
      const output = ctx.nodeOutputs[nodeId];
      if (output !== undefined) {
        collected.push(output);
        merged[nodeId] = output;
      }
    }
    merged.collected = collected;
  } else {
    // If no specific sources, collect all available node outputs
    merged.allOutputs = { ...ctx.nodeOutputs };
  }

  // Apply merge strategy
  switch (mergeStrategy) {
    case 'first':
      // Return first non-empty result
      if (sourceNodes) {
        for (const nodeId of sourceNodes) {
          const output = ctx.nodeOutputs[nodeId];
          if (output && Object.keys(output).length > 0) {
            merged.result = output;
            break;
          }
        }
      }
      break;

    case 'concat':
      // Concatenate array results
      const arrays: unknown[] = [];
      for (const [key, value] of Object.entries(ctx.nodeOutputs)) {
        if (Array.isArray(value)) {
          arrays.push(...value);
        } else if (value && typeof value === 'object') {
          const arr = (value as Record<string, unknown>).items;
          if (Array.isArray(arr)) {
            arrays.push(...arr);
          }
        }
      }
      merged.result = arrays;
      break;

    case 'collect':
    default:
      // Default: just collect all outputs (already done above)
      break;
  }

  return merged;
}
