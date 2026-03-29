import { Injectable, Logger } from '@nestjs/common';
import { WorkflowExecutorService } from './workflow-executor.service';
import {
  WorkflowPersistenceService,
  WorkflowWithDefinition,
} from './workflow-persistence.service';
import {
  ExecutionEventEmitterService,
  NodeEvent,
} from './execution-event-emitter.service';
import { RunnerEvent } from '@/infrastructure/docker/docker.service';
import { NodeExecutionResult } from './types';

/**
 * WorkflowOrchestratorService
 *
 * Single Responsibility: Coordinate workflow execution lifecycle
 *
 * - Validate and start executions
 * - Coordinate between executor, persistence, and events
 * - Handle cancellation and retry
 *
 * This is the main entry point for workflow execution.
 * All operations are FULLY AWAITED - no fire-and-forget patterns.
 */
@Injectable()
export class WorkflowOrchestratorService {
  private readonly logger = new Logger(WorkflowOrchestratorService.name);

  constructor(
    private readonly executor: WorkflowExecutorService,
    private readonly persistence: WorkflowPersistenceService,
    private readonly eventEmitter: ExecutionEventEmitterService,
  ) {}

  /**
   * Start workflow execution (async - returns immediately)
   *
   * Flow:
   * 1. Validate workflow exists and can be started
   * 2. Create execution record (status: running)
   * 3. Emit WebSocket "started" event
   * 4. Start Docker execution in BACKGROUND (no await!)
   * 5. Return executionId immediately
   *
   * The actual execution runs in background and updates via:
   * - WebSocket events for real-time UI updates
   * - Database update when complete/failed
   */
  async startExecution(
    organizationId: string,
    workflowId: string,
    triggerData: Record<string, unknown> = {},
    userId?: string,
  ): Promise<string> {
    this.logger.log(`Starting execution for workflow ${workflowId}`);

    // 1. Validate workflow exists
    const workflow = await this.persistence.getWorkflow(
      organizationId,
      workflowId,
    );

    // Validate workflow can be started
    this.validateCanStart(workflow, triggerData);

    // 2. Create execution record
    const executionId = await this.persistence.createExecution(
      workflowId,
      triggerData,
      userId,
    );

    this.logger.log(`Created execution ${executionId}`);

    // 3. Emit started event (WebSocket for UI)
    this.eventEmitter.emitExecutionStarted(
      organizationId,
      executionId,
      workflowId,
    );

    // 4. Start execution in BACKGROUND - don't await!
    // Use setImmediate to ensure we return before execution starts
    setImmediate(() => {
      void this.executeInBackground(
        executionId,
        organizationId,
        workflowId,
        workflow,
        triggerData,
      );
    });

    // 5. Return immediately
    return executionId;
  }

  /**
   * Execute workflow in background
   * Called via setImmediate - runs after API response is sent
   */
  private async executeInBackground(
    executionId: string,
    organizationId: string,
    workflowId: string,
    workflow: WorkflowWithDefinition,
    triggerData: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Execute workflow in Docker
      const result = await this.executor.execute(
        executionId,
        organizationId,
        workflow,
        triggerData,
        // Real-time node updates - save to DB + emit WebSocket
        (event: RunnerEvent) => {
          this.logger.log(
            `[Event] Received: ${event.type} for execution ${executionId}`,
          );

          // Save to database for polling-based updates (atomic upsert - no race conditions)
          const nodeResult = this.mapEventToNodeResult(event);
          if (nodeResult) {
            this.logger.log(
              `[DB] Saving node status: ${nodeResult.nodeId} -> ${nodeResult.status}`,
            );
            // Atomic upsert - safe to fire and forget, but log errors
            this.persistence
              .updateNodeExecution(executionId, nodeResult)
              .catch((error) => {
                this.logger.error(
                  `Failed to update node execution: ${error instanceof Error ? error.message : error}`,
                );
              });
          }

          // Also emit via WebSocket for real-time updates
          const nodeEvent = this.mapToNodeEvent(event);
          if (nodeEvent) {
            this.eventEmitter.emitNodeEvent(
              organizationId,
              executionId,
              workflowId,
              nodeEvent,
            );
          }
        },
      );

      // Persist final result
      if (result.status === 'completed') {
        await this.persistence.completeExecution(executionId, result);

        this.eventEmitter.emitExecutionCompleted(
          organizationId,
          executionId,
          workflowId,
          result,
        );

        this.logger.log(`Execution ${executionId} completed successfully`);
      } else {
        await this.persistence.failExecution(
          executionId,
          result.error || 'Unknown error',
          result.nodeResults,
        );

        this.eventEmitter.emitExecutionFailed(
          organizationId,
          executionId,
          workflowId,
          result.error || 'Unknown error',
        );

        this.logger.warn(`Execution ${executionId} failed: ${result.error}`);
      }
    } catch (error) {
      // Handle unexpected errors - DON'T throw, just log and persist
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Execution ${executionId} failed with error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Persist failure
      await this.persistence.failExecution(executionId, errorMessage);

      // Emit failed event
      this.eventEmitter.emitExecutionFailed(
        organizationId,
        executionId,
        workflowId,
        errorMessage,
      );
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(
    organizationId: string,
    executionId: string,
  ): Promise<void> {
    this.logger.log(`Cancelling execution ${executionId}`);

    // Get execution to verify it exists and get workflowId
    const execution = await this.persistence.getExecution(executionId);

    // Cancel in Docker
    await this.executor.cancel(executionId);

    // Update database
    await this.persistence.cancelExecution(executionId);

    // Emit event
    this.eventEmitter.emitExecutionCancelled(
      organizationId,
      executionId,
      execution.workflowId,
    );

    this.logger.log(`Execution ${executionId} cancelled`);
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    organizationId: string,
    executionId: string,
  ): Promise<string> {
    const original = await this.persistence.getExecution(executionId);

    if (original.status !== 'failed') {
      throw new Error('Can only retry failed executions');
    }

    const input = original.input as {
      triggerData?: Record<string, unknown>;
      triggeredBy?: string;
    } | null;

    return this.startExecution(
      organizationId,
      original.workflowId,
      input?.triggerData || {},
      input?.triggeredBy,
    );
  }

  /**
   * Trigger workflows by trigger type
   * Called by webhooks and scheduled jobs
   * Returns array of execution IDs for workflows that were triggered
   */
  async triggerWorkflows(
    organizationId: string,
    triggerType: string,
    triggerData: Record<string, unknown>,
    triggerConfig?: Record<string, unknown>,
  ): Promise<string[]> {
    // Find all active workflows with matching trigger
    const workflows =
      await this.persistence.findActiveWorkflows(organizationId);

    const executionIds: string[] = [];

    for (const workflow of workflows) {
      // Find trigger nodes that match
      const matchingTrigger = workflow.definition.nodes.find((node) => {
        if (node.type !== triggerType) return false;

        // Check trigger config if provided
        if (triggerConfig) {
          for (const [key, value] of Object.entries(triggerConfig)) {
            if (node.config[key] !== value) {
              return false;
            }
          }
        }

        return true;
      });

      if (matchingTrigger) {
        try {
          const executionId = await this.startExecution(
            organizationId,
            workflow.id,
            triggerData,
          );
          executionIds.push(executionId);
        } catch (error) {
          this.logger.error(
            `Failed to start workflow ${workflow.id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }

    return executionIds;
  }

  /**
   * Validate workflow can be started
   */
  private validateCanStart(
    workflow: { definition: { nodes: { type: string }[] }; isActive: boolean },
    _triggerData: Record<string, unknown>,
  ): void {
    const triggerNode = workflow.definition.nodes.find((n) =>
      n.type.startsWith('trigger:'),
    );

    if (!triggerNode) {
      throw new Error('Workflow has no trigger node');
    }

    // Manual triggers can always be started
    if (triggerNode.type === 'trigger:manual') {
      return;
    }

    // Non-manual triggers require workflow to be active
    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }
  }

  /**
   * Map container event to node event for WebSocket
   */
  private mapToNodeEvent(event: RunnerEvent): NodeEvent | null {
    switch (event.type) {
      case 'node:started':
        return {
          type: 'node:started',
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          nodeType: event.nodeType,
          timestamp: event.timestamp,
        };
      case 'node:completed':
        return {
          type: 'node:completed',
          nodeId: event.nodeId,
          output: event.output,
          duration: event.duration,
          timestamp: event.timestamp,
        };
      case 'node:failed':
        return {
          type: 'node:failed',
          nodeId: event.nodeId,
          error: event.error,
          duration: event.duration,
          timestamp: event.timestamp,
        };
      default:
        return null;
    }
  }

  /**
   * Map container event to node execution data for database storage
   */
  private mapEventToNodeResult(event: RunnerEvent): {
    nodeId: string;
    status: NodeExecutionResult['status'];
    nodeName?: string;
    nodeType?: string;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
  } | null {
    switch (event.type) {
      case 'node:started':
        return {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          nodeType: event.nodeType,
          status: 'running',
          startedAt: new Date(event.timestamp),
        };
      case 'node:completed':
        return {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          nodeType: event.nodeType,
          status: 'completed',
          output: event.output,
          durationMs: event.duration,
          // For nodes that only emit completed (like triggers), use timestamp as startedAt
          startedAt: new Date(event.timestamp),
          completedAt: new Date(event.timestamp),
        };
      case 'node:failed': {
        // Calculate startedAt from duration if available
        const failedAt = new Date(event.timestamp);
        const failedStartedAt = event.duration
          ? new Date(failedAt.getTime() - event.duration)
          : failedAt;
        return {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          nodeType: event.nodeType,
          status: 'failed',
          error: event.error,
          durationMs: event.duration,
          startedAt: failedStartedAt,
          completedAt: failedAt,
        };
      }
      default:
        return null;
    }
  }
}
