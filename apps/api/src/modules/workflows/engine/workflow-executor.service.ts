import { Injectable, Logger } from '@nestjs/common';
import {
  DockerService,
  WorkflowJobPayload,
  RunnerEvent,
} from '@/infrastructure/docker/docker.service';
import { CredentialsLoaderService } from './credentials-loader.service';
import { NodeEnricherService } from './node-enricher.service';
import {
  ExecutionResult,
  WorkflowWithDefinition,
} from './workflow-persistence.service';
import { NodeExecutionResult } from './types';

/**
 * WorkflowExecutorService
 *
 * Single Responsibility: Execute workflow in Docker container
 *
 * - Prepare job payload (credentials, enriched nodes)
 * - Execute in Docker container
 * - Parse container result to ExecutionResult
 */
@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly dockerService: DockerService,
    private readonly credentialsLoader: CredentialsLoaderService,
    private readonly nodeEnricher: NodeEnricherService,
  ) {}

  /**
   * Execute workflow in Docker container
   * AWAITS until container completes - no fire-and-forget!
   *
   * @param onEvent - Callback for real-time events (WebSocket updates)
   */
  async execute(
    executionId: string,
    organizationId: string,
    workflow: WorkflowWithDefinition,
    triggerData: Record<string, unknown>,
    onEvent?: (event: RunnerEvent) => void,
  ): Promise<ExecutionResult> {
    this.logger.log(
      `Executing workflow ${workflow.id} in container for execution ${executionId}`,
    );

    // 1. Load credentials
    const credentials = await this.credentialsLoader.load(organizationId);

    // 2. Enrich node configs
    const enrichedNodes = await this.nodeEnricher.enrich(
      organizationId,
      workflow.definition.nodes,
    );

    // 3. Build job payload
    const job: WorkflowJobPayload = {
      executionId,
      workflowId: workflow.id,
      organizationId,
      definition: {
        nodes: enrichedNodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          config: n.config,
        })),
        edges: workflow.definition.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          condition: e.condition,
        })),
        variables: workflow.definition.variables,
      },
      triggerData,
      credentials,
    };

    // 4. Execute in Docker - AWAIT full completion
    const result = await this.dockerService.executeWorkflow(job, onEvent);

    // 5. Parse and return result
    return this.parseContainerResult(result);
  }

  /**
   * Cancel running execution
   */
  async cancel(executionId: string): Promise<boolean> {
    this.logger.log(`Cancelling execution ${executionId}`);
    return this.dockerService.cancelExecution(executionId);
  }

  /**
   * Parse container result to ExecutionResult
   * Single source of truth: container's final nodeResults
   */
  private parseContainerResult(result: {
    exitCode: number;
    timedOut: boolean;
    events: RunnerEvent[];
  }): ExecutionResult {
    // Find final event
    const finalEvent = result.events.find(
      (e) => e.type === 'workflow:completed' || e.type === 'workflow:failed',
    );

    // Handle timeout
    if (result.timedOut) {
      return {
        status: 'failed',
        error: 'Workflow execution timed out',
        nodeResults: this.extractNodeResultsFromEvents(result.events),
        output: {},
      };
    }

    // Handle no final event - extract error from node:failed events or logs
    if (!finalEvent) {
      const nodeResults = this.extractNodeResultsFromEvents(result.events);
      let error: string | undefined;

      if (result.exitCode !== 0) {
        // Try to get error from failed node
        const failedNode = nodeResults.find((n) => n.status === 'failed');
        if (failedNode?.error) {
          error = failedNode.error;
        } else {
          // Try to get error from log events
          const errorLogs = result.events
            .filter(
              (e) =>
                e.type === 'log' && e.level === 'error' && e.message?.trim(),
            )
            .map((e) => (e as { message: string }).message);

          if (errorLogs.length > 0) {
            error = errorLogs[errorLogs.length - 1]; // Last error log
          } else {
            error = `Container exited with code ${result.exitCode}`;
          }
        }
      }

      return {
        status: result.exitCode === 0 ? 'completed' : 'failed',
        error,
        nodeResults,
        output: {},
      };
    }

    // Handle workflow:completed
    if (finalEvent.type === 'workflow:completed') {
      return {
        status: 'completed',
        nodeResults: finalEvent.result
          .nodeResults as unknown as NodeExecutionResult[],
        output: finalEvent.result.output || {},
      };
    }

    // Handle workflow:failed
    return {
      status: 'failed',
      error: finalEvent.error,
      nodeResults: finalEvent.result
        .nodeResults as unknown as NodeExecutionResult[],
      output: finalEvent.result.output || {},
    };
  }

  /**
   * Fallback: extract node results from individual events
   * Used only when container crashes before sending final event
   */
  private extractNodeResultsFromEvents(
    events: RunnerEvent[],
  ): NodeExecutionResult[] {
    const nodeMap = new Map<string, NodeExecutionResult>();

    for (const event of events) {
      if (event.type === 'node:started') {
        nodeMap.set(event.nodeId, {
          nodeId: event.nodeId,
          status: 'running',
          startedAt: new Date(event.timestamp),
        });
      } else if (event.type === 'node:completed') {
        const existing = nodeMap.get(event.nodeId);
        nodeMap.set(event.nodeId, {
          nodeId: event.nodeId,
          status: 'completed',
          output: event.output,
          duration: event.duration,
          startedAt: existing?.startedAt || new Date(event.timestamp),
          completedAt: new Date(event.timestamp),
        });
      } else if (event.type === 'node:failed') {
        const existing = nodeMap.get(event.nodeId);
        nodeMap.set(event.nodeId, {
          nodeId: event.nodeId,
          status: 'failed',
          error: event.error,
          duration: event.duration,
          startedAt: existing?.startedAt || new Date(event.timestamp),
          completedAt: new Date(event.timestamp),
        });
      }
    }

    return Array.from(nodeMap.values());
  }
}
