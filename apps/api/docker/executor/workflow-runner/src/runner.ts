#!/usr/bin/env node
/**
 * Workflow Runner - Main Entry Point
 *
 * This script runs inside a Docker container and executes a workflow.
 * It receives the workflow definition via stdin or file and emits
 * progress events as JSON lines to stdout.
 *
 * Supports parallel execution of independent nodes using topological levels.
 *
 * Usage:
 *   echo '{"executionId": "...", "definition": {...}, ...}' | node runner.js
 *   node runner.js --job /workspace/job.json
 */

import { readFile } from 'fs/promises';
import type { WorkflowJob, WorkflowResult, NodeResult, WorkflowNode, WorkflowEdge } from './types.js';
import type { ExpressionContext } from './expression.js';
import { interpolateObject, evaluateCondition } from './expression.js';
import { executeNode, type ExecutorContext } from './executors/index.js';
import { emit, logger } from './logger.js';

/**
 * Compute execution levels using topological sort (Kahn's algorithm)
 * Nodes at the same level can be executed in parallel
 */
function computeExecutionLevels(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  triggerNodeIds: Set<string>,
): Map<string, number> {
  const levels = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacencyList.set(node.id, []);
  }

  // Build adjacency list and compute in-degrees
  for (const edge of edges) {
    adjacencyList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Trigger nodes are at level 0
  const queue: Array<{ nodeId: string; level: number }> = [];
  for (const triggerId of triggerNodeIds) {
    levels.set(triggerId, 0);
    queue.push({ nodeId: triggerId, level: 0 });
  }

  // BFS to assign levels
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighbor of neighbors) {
      // Node level is max of all incoming paths + 1
      const currentLevel = levels.get(neighbor) ?? -1;
      const newLevel = level + 1;

      if (newLevel > currentLevel) {
        levels.set(neighbor, newLevel);
      }

      // Decrease in-degree and queue when all dependencies processed
      const newInDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newInDegree);

      if (newInDegree === 0) {
        queue.push({ nodeId: neighbor, level: levels.get(neighbor)! });
      }
    }
  }

  return levels;
}

/**
 * Group nodes by their execution level
 */
function groupNodesByLevel(levels: Map<string, number>): Map<number, string[]> {
  const groups = new Map<number, string[]>();

  for (const [nodeId, level] of levels) {
    const group = groups.get(level) || [];
    group.push(nodeId);
    groups.set(level, group);
  }

  return groups;
}

/**
 * Main runner function
 */
async function run(): Promise<void> {
  let job: WorkflowJob | undefined;

  try {
    job = await loadJob();
    logger.info(`Starting workflow execution: ${job.executionId}`);

    await emit({
      type: 'workflow:started',
      executionId: job.executionId,
      timestamp: new Date().toISOString(),
    });

    const result = await executeWorkflow(job);

    if (result.status === 'completed') {
      await emit({
        type: 'workflow:completed',
        result,
        timestamp: new Date().toISOString(),
      });
    } else {
      await emit({
        type: 'workflow:failed',
        error: result.error || 'Unknown error',
        result,
        timestamp: new Date().toISOString(),
      });
    }

    // Wait a tick for any remaining output, then exit
    await new Promise((resolve) => setImmediate(resolve));
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const now = new Date().toISOString();

    const errorResult: WorkflowResult = {
      executionId: job?.executionId || 'unknown',
      status: 'failed',
      nodeResults: [],
      error: errorMessage,
      startedAt: now,
      completedAt: now,
      duration: 0,
    };

    await emit({
      type: 'workflow:failed',
      error: errorMessage,
      result: errorResult,
      timestamp: now,
    });

    logger.error(`Workflow failed: ${errorMessage}`);

    // Wait a tick for any remaining output
    await new Promise((resolve) => setImmediate(resolve));
    process.exit(1);
  }
}

/**
 * Load job from environment variable, file, or stdin
 */
async function loadJob(): Promise<WorkflowJob> {
  // 1. Check for WORKFLOW_JOB environment variable (base64 encoded)
  const envJob = process.env.WORKFLOW_JOB;
  if (envJob) {
    try {
      const decoded = Buffer.from(envJob, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error(`Failed to parse WORKFLOW_JOB env var: ${error}`);
    }
  }

  // 2. Check for --job argument (file path)
  const jobArgIndex = process.argv.indexOf('--job');
  if (jobArgIndex !== -1 && process.argv[jobArgIndex + 1]) {
    const jobPath = process.argv[jobArgIndex + 1];
    const content = await readFile(jobPath, 'utf8');
    return JSON.parse(content);
  }

  // 3. Read from stdin as fallback
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      try {
        if (!data.trim()) {
          reject(new Error('No job data received from stdin'));
          return;
        }
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error(`Failed to parse job JSON: ${error}`));
      }
    });

    process.stdin.on('error', reject);

    // Timeout after 5 seconds if no input
    setTimeout(() => {
      if (!data) {
        reject(new Error('No job data received (checked WORKFLOW_JOB env, --job arg, and stdin)'));
      }
    }, 5000);
  });
}

/**
 * Execute the workflow with parallel execution of independent nodes
 */
async function executeWorkflow(job: WorkflowJob): Promise<WorkflowResult> {
  const { executionId, definition, credentials, triggerData, config } = job;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  // Build lookup maps
  const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));
  const incomingEdges = new Map<string, WorkflowEdge[]>();
  const outgoingEdges = new Map<string, WorkflowEdge[]>();

  for (const edge of definition.edges) {
    // Build incoming edges map
    const incoming = incomingEdges.get(edge.target) || [];
    incoming.push(edge);
    incomingEdges.set(edge.target, incoming);

    // Build outgoing edges map
    const outgoing = outgoingEdges.get(edge.source) || [];
    outgoing.push(edge);
    outgoingEdges.set(edge.source, outgoing);
  }

  // Initialize context
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
  const workflowContext: Record<string, unknown> = {
    ...(definition.variables || {}),
  };

  const expressionContext: ExpressionContext = {
    trigger: triggerData || {},
    vars: definition.variables || {},
    nodes: nodeOutputs,
    ctx: workflowContext,
    env: (() => {
      const sensitiveKeys = new Set([
        'WORKFLOW_JOB', 'SESSION_CONFIG', 'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY', 'ENCRYPTION_KEY', 'JWT_SECRET',
        'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'API_TOKEN',
        'XAI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY',
        'CUSTOM_API_KEY', 'SENTRY_DSN',
      ]);
      const safe: Record<string, string> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (v && !sensitiveKeys.has(k)) {
          safe[k] = v;
        }
      }
      return safe;
    })(),
  };

  const executorContext: ExecutorContext = {
    workingDir: config?.workingDir || '/workspace',
    credentials: {
      ai: credentials.ai,
      gitToken: credentials.git?.token,
      gitProvider: credentials.git?.provider,
      slack: credentials.slack,
    },
    expressionContext,
    nodeOutputs,
    workflowContext,
  };

  const nodeResults: NodeResult[] = [];
  const executedNodes = new Set<string>();
  const skippedNodes = new Set<string>();
  const failedNodes = new Set<string>();

  // Find trigger nodes (starting points)
  const triggerNodes = definition.nodes.filter((n) => n.type.startsWith('trigger:'));

  if (triggerNodes.length === 0) {
    throw new Error('Workflow has no trigger node');
  }

  // Initialize trigger nodes with trigger data and add to results
  const triggerTimestamp = new Date().toISOString();
  const triggerNodeIds = new Set<string>();

  for (const trigger of triggerNodes) {
    nodeOutputs[trigger.id] = triggerData || {};
    executedNodes.add(trigger.id);
    triggerNodeIds.add(trigger.id);

    // Add trigger to nodeResults so frontend shows correct node count
    nodeResults.push({
      nodeId: trigger.id,
      status: 'completed',
      output: triggerData || {},
      startedAt: triggerTimestamp,
      completedAt: triggerTimestamp,
      duration: 0,
    });

    await emit({
      type: 'node:completed',
      nodeId: trigger.id,
      nodeName: trigger.name,
      nodeType: trigger.type,
      output: triggerData || {},
      duration: 0,
      timestamp: triggerTimestamp,
    });
  }

  // Compute execution levels for parallel processing
  const executionLevels = computeExecutionLevels(
    definition.nodes,
    definition.edges,
    triggerNodeIds,
  );
  const levelGroups = groupNodesByLevel(executionLevels);

  // Get sorted level numbers (skip level 0 which are triggers)
  const levels = Array.from(levelGroups.keys()).filter(l => l > 0).sort((a, b) => a - b);

  logger.info(`Parallel execution: ${levels.length} levels, ${definition.nodes.length} total nodes`);

  /**
   * Execute a single node with condition checking
   */
  async function executeSingleNode(
    nodeId: string,
  ): Promise<{ nodeId: string; result: NodeResult; failed: boolean; continueOnError: boolean }> {
    const node = nodeMap.get(nodeId)!;

    // Check if all incoming edges allow execution
    const incoming = incomingEdges.get(nodeId) || [];
    let shouldExecute = false;

    for (const edge of incoming) {
      // If source was skipped or failed (without continue), skip this node
      if (skippedNodes.has(edge.source)) {
        continue;
      }

      if (failedNodes.has(edge.source)) {
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode?.onError !== 'continue') {
          continue;
        }
      }

      // Evaluate edge condition if present
      if (edge.condition) {
        logger.debug(`Evaluating condition for edge ${edge.id}: "${edge.condition}"`);
        const conditionResult = evaluateCondition(edge.condition, expressionContext);
        logger.debug(`Edge ${edge.id} condition result: ${conditionResult}`);

        if (conditionResult) {
          shouldExecute = true;
        }
      } else {
        // No condition means always follow this edge
        shouldExecute = true;
      }
    }

    // Skip this node if no incoming edges allow execution
    if (!shouldExecute && incoming.length > 0) {
      logger.info(`Skipping node ${nodeId} - no incoming edge conditions passed`);
      const nodeSkippedAt = new Date().toISOString();
      return {
        nodeId,
        result: {
          nodeId: node.id,
          status: 'skipped',
          startedAt: nodeSkippedAt,
          completedAt: nodeSkippedAt,
          duration: 0,
        },
        failed: false,
        continueOnError: true,
      };
    }

    // Execute the node
    const nodeStartedAt = new Date().toISOString();
    const nodeStartTime = Date.now();

    await emit({
      type: 'node:started',
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      timestamp: nodeStartedAt,
    });

    try {
      logger.debug(`Node ${node.id} - Available outputs: ${JSON.stringify(nodeOutputs, null, 2)}`);
      logger.debug(`Node ${node.id} - Original config: ${JSON.stringify(node.config)}`);

      // Interpolate config with current context
      const interpolatedConfig = interpolateObject(
        node.config || {},
        expressionContext,
      );

      logger.debug(`Node ${node.id} - Interpolated config: ${JSON.stringify(interpolatedConfig)}`);

      // Execute the node
      const output = await executeNode(node, interpolatedConfig, executorContext);

      // Store output
      nodeOutputs[node.id] = output;
      logger.debug(`Node ${node.id} - Output stored: ${JSON.stringify(output)}`);

      const nodeCompletedAt = new Date().toISOString();
      const nodeDuration = Date.now() - nodeStartTime;

      await emit({
        type: 'node:completed',
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        output,
        duration: nodeDuration,
        timestamp: nodeCompletedAt,
      });

      logger.info(`Node ${node.id} completed in ${nodeDuration}ms`);

      return {
        nodeId,
        result: {
          nodeId: node.id,
          status: 'completed',
          output,
          startedAt: nodeStartedAt,
          completedAt: nodeCompletedAt,
          duration: nodeDuration,
        },
        failed: false,
        continueOnError: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const nodeCompletedAt = new Date().toISOString();
      const nodeDuration = Date.now() - nodeStartTime;

      await emit({
        type: 'node:failed',
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        error: errorMessage,
        duration: nodeDuration,
        timestamp: nodeCompletedAt,
      });

      logger.error(`Node ${node.id} failed: ${errorMessage}`);

      return {
        nodeId,
        result: {
          nodeId: node.id,
          status: 'failed',
          error: errorMessage,
          startedAt: nodeStartedAt,
          completedAt: nodeCompletedAt,
          duration: nodeDuration,
        },
        failed: true,
        continueOnError: node.onError === 'continue',
      };
    }
  }

  // Execute levels in order, nodes within each level in parallel
  let workflowFailed = false;
  let failureError = '';

  for (const level of levels) {
    const nodesAtLevel = levelGroups.get(level) || [];

    if (nodesAtLevel.length === 0) continue;

    // Filter out nodes whose dependencies haven't been processed yet
    const eligibleNodes = nodesAtLevel.filter(nodeId => {
      if (executedNodes.has(nodeId) || skippedNodes.has(nodeId)) {
        return false;
      }

      const incoming = incomingEdges.get(nodeId) || [];
      return incoming.every(edge =>
        executedNodes.has(edge.source) || skippedNodes.has(edge.source) || failedNodes.has(edge.source)
      );
    });

    if (eligibleNodes.length === 0) continue;

    logger.info(`Executing level ${level} with ${eligibleNodes.length} nodes in parallel`);

    // Execute all nodes at this level in parallel
    const results = await Promise.all(
      eligibleNodes.map(nodeId => executeSingleNode(nodeId))
    );

    // Process results
    for (const { nodeId, result, failed, continueOnError } of results) {
      nodeResults.push(result);

      if (result.status === 'skipped') {
        skippedNodes.add(nodeId);
      } else if (failed) {
        failedNodes.add(nodeId);
        if (!continueOnError) {
          workflowFailed = true;
          failureError = `Node ${nodeId} failed: ${result.error}`;
        } else {
          executedNodes.add(nodeId);
        }
      } else {
        executedNodes.add(nodeId);
      }
    }

    // If workflow failed and we shouldn't continue, stop execution
    if (workflowFailed) {
      const completedAt = new Date().toISOString();
      return {
        executionId,
        status: 'failed',
        nodeResults,
        error: failureError,
        startedAt,
        completedAt,
        duration: Date.now() - startTime,
      };
    }
  }

  const completedAt = new Date().toISOString();
  return {
    executionId,
    status: 'completed',
    nodeResults,
    output: nodeOutputs,
    startedAt,
    completedAt,
    duration: Date.now() - startTime,
  };
}

// Run the workflow
run();
