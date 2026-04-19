import { Injectable } from '@nestjs/common';
import { EventsGateway } from '@/infrastructure/websocket/events.gateway';
import { ExecutionResult } from './workflow-persistence.service';

/**
 * Container event types
 */
export interface NodeStartedEvent {
  type: 'node:started';
  nodeId: string;
  nodeName: string;
  nodeType: string;
  timestamp: string;
}

export interface NodeCompletedEvent {
  type: 'node:completed';
  nodeId: string;
  output?: Record<string, unknown>;
  duration: number;
  timestamp: string;
}

export interface NodeFailedEvent {
  type: 'node:failed';
  nodeId: string;
  error: string;
  duration: number;
  timestamp: string;
}

export type NodeEvent = NodeStartedEvent | NodeCompletedEvent | NodeFailedEvent;

/**
 * ExecutionEventEmitterService
 *
 * Single Responsibility: WebSocket notifications for real-time UI updates
 *
 * - Emit execution lifecycle events (started, completed, failed, cancelled)
 * - Emit node status events
 *
 * NOTE: These events are for UI updates only.
 * Database persistence is handled separately by WorkflowPersistenceService.
 */
@Injectable()
export class ExecutionEventEmitterService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  /**
   * Emit when execution starts
   */
  emitExecutionStarted(
    organizationId: string,
    executionId: string,
    workflowId: string,
  ): void {
    this.eventsGateway.emitWorkflowExecutionStarted(organizationId, {
      executionId,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit node status update from container event
   * Maps container events to WebSocket payloads
   */
  emitNodeEvent(
    organizationId: string,
    executionId: string,
    workflowId: string,
    event: NodeEvent,
  ): void {
    switch (event.type) {
      case 'node:started':
        void this.eventsGateway.emitWorkflowNodeUpdate(
          organizationId,
          executionId,
          {
            executionId,
            workflowId,
            nodeId: event.nodeId,
            nodeName: event.nodeName,
            nodeType: event.nodeType,
            status: 'running',
            startedAt: event.timestamp,
          },
        );
        break;

      case 'node:completed':
        void this.eventsGateway.emitWorkflowNodeUpdate(
          organizationId,
          executionId,
          {
            executionId,
            workflowId,
            nodeId: event.nodeId,
            nodeName: '',
            nodeType: '',
            status: 'completed',
            output: event.output,
            duration: event.duration,
            completedAt: event.timestamp,
          },
        );
        break;

      case 'node:failed':
        void this.eventsGateway.emitWorkflowNodeUpdate(
          organizationId,
          executionId,
          {
            executionId,
            workflowId,
            nodeId: event.nodeId,
            nodeName: '',
            nodeType: '',
            status: 'failed',
            error: event.error,
            duration: event.duration,
            completedAt: event.timestamp,
          },
        );
        break;
    }
  }

  /**
   * Emit when execution completes successfully
   */
  emitExecutionCompleted(
    organizationId: string,
    executionId: string,
    workflowId: string,
    result: ExecutionResult,
  ): void {
    this.eventsGateway.emitWorkflowExecutionCompleted(organizationId, {
      executionId,
      workflowId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      output: result.output,
    });
  }

  /**
   * Emit when execution fails
   */
  emitExecutionFailed(
    organizationId: string,
    executionId: string,
    workflowId: string,
    error: string,
  ): void {
    this.eventsGateway.emitWorkflowExecutionFailed(organizationId, {
      executionId,
      workflowId,
      status: 'failed',
      error,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit when execution is cancelled
   */
  emitExecutionLog(
    organizationId: string,
    executionId: string,
    _workflowId: string,
    _level: string,
    message: string,
  ): void {
    this.eventsGateway.server
      .to(`execution:${executionId}`)
      .emit('workflow:execution:log', { executionId, message });
  }

  emitExecutionCancelled(
    organizationId: string,
    executionId: string,
    workflowId: string,
  ): void {
    // Use failed event with cancelled status for now
    // TODO: Add dedicated cancelled event if needed
    this.eventsGateway.emitWorkflowExecutionFailed(organizationId, {
      executionId,
      workflowId,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });
  }
}
