import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { WorkflowDefinition, NodeExecutionResult } from './types';
import { Prisma } from '@prisma/client';

/**
 * Execution result from container
 */
export interface ExecutionResult {
  status: 'completed' | 'failed';
  error?: string;
  nodeResults: NodeExecutionResult[];
  output: Record<string, unknown>;
}

/**
 * Workflow with parsed definition
 */
export interface WorkflowWithDefinition {
  id: string;
  organizationId: string;
  name: string;
  definition: WorkflowDefinition;
  isActive: boolean;
}

/**
 * WorkflowPersistenceService
 *
 * Single Responsibility: Database operations for workflow executions
 *
 * - Create execution records
 * - Update execution status (atomic)
 * - Query execution data
 */
@Injectable()
export class WorkflowPersistenceService {
  private readonly logger = new Logger(WorkflowPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get workflow by ID
   * @throws NotFoundException if workflow not found
   */
  async getWorkflow(
    organizationId: string,
    workflowId: string,
  ): Promise<WorkflowWithDefinition> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      name: workflow.name,
      definition: workflow.definition as unknown as WorkflowDefinition,
      isActive: workflow.isActive,
    };
  }

  /**
   * Create new execution record
   * Status starts as 'running'
   */
  async createExecution(
    workflowId: string,
    triggerData: Record<string, unknown>,
    userId?: string,
  ): Promise<string> {
    const executionId = uuidv4();

    await this.prisma.workflowExecution.create({
      data: {
        id: executionId,
        workflowId,
        status: 'running',
        input: {
          triggerData,
          triggeredBy: userId,
        } as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    return executionId;
  }

  async saveExecutionLogs(
    executionId: string,
    logs: Array<{ timestamp: string; message: string }>,
  ): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { logs: logs as Prisma.InputJsonValue },
    });
  }

  /**
   * Mark execution as completed
   * Final sync: ensures all nodeResults are saved to nodeExecutions table
   */
  async completeExecution(
    executionId: string,
    result: ExecutionResult,
  ): Promise<void> {
    // Final sync of all node results to nodeExecutions table
    // This ensures we have complete data even if real-time updates were missed
    await this.syncNodeResults(executionId, result.nodeResults);

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        currentNode: null,
        output: result.output as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Mark execution as failed
   * Final sync: ensures all nodeResults are saved to nodeExecutions table
   */
  async failExecution(
    executionId: string,
    error: string,
    nodeResults: NodeExecutionResult[] = [],
  ): Promise<void> {
    // Final sync of all node results to nodeExecutions table
    if (nodeResults.length > 0) {
      await this.syncNodeResults(executionId, nodeResults);
    }

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        currentNode: null,
        error,
      },
    });
  }

  /**
   * Sync all node results to nodeExecutions table
   * Uses Promise.allSettled to handle partial failures gracefully
   */
  private async syncNodeResults(
    executionId: string,
    nodeResults: NodeExecutionResult[],
  ): Promise<void> {
    const results = await Promise.allSettled(
      nodeResults.map((node) =>
        this.prisma.nodeExecution.upsert({
          where: {
            executionId_nodeId: {
              executionId,
              nodeId: node.nodeId,
            },
          },
          create: {
            executionId,
            nodeId: node.nodeId,
            status: node.status,
            output: node.output as Prisma.InputJsonValue,
            error: node.error,
            startedAt: node.startedAt,
            completedAt: node.completedAt,
            durationMs: node.duration,
          },
          update: {
            status: node.status,
            output: node.output as Prisma.InputJsonValue,
            error: node.error,
            completedAt: node.completedAt,
            durationMs: node.duration,
          },
        }),
      ),
    );

    // Log any failures but don't throw - other nodes were saved
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to sync node ${nodeResults[idx].nodeId}: ${result.reason}`,
        );
      }
    });
  }

  /**
   * Mark execution as cancelled
   */
  async cancelExecution(executionId: string): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Update node execution status in real-time
   * Uses transaction for atomic updates of both tables
   */
  async updateNodeExecution(
    executionId: string,
    nodeResult: {
      nodeId: string;
      status: NodeExecutionResult['status'];
      nodeName?: string;
      nodeType?: string;
      output?: Record<string, unknown>;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
      durationMs?: number;
    },
  ): Promise<void> {
    // Use transaction to ensure both updates succeed or fail together
    await this.prisma.$transaction([
      // Atomic upsert for node execution
      this.prisma.nodeExecution.upsert({
        where: {
          executionId_nodeId: {
            executionId,
            nodeId: nodeResult.nodeId,
          },
        },
        create: {
          executionId,
          nodeId: nodeResult.nodeId,
          nodeName: nodeResult.nodeName,
          nodeType: nodeResult.nodeType,
          status: nodeResult.status,
          output: nodeResult.output as Prisma.InputJsonValue,
          error: nodeResult.error,
          startedAt: nodeResult.startedAt || new Date(),
          completedAt: nodeResult.completedAt,
          durationMs: nodeResult.durationMs,
        },
        update: {
          status: nodeResult.status,
          output: nodeResult.output as Prisma.InputJsonValue,
          error: nodeResult.error,
          completedAt: nodeResult.completedAt,
          durationMs: nodeResult.durationMs,
          // Only update nodeName/nodeType if provided (for 'started' events)
          ...(nodeResult.nodeName && { nodeName: nodeResult.nodeName }),
          ...(nodeResult.nodeType && { nodeType: nodeResult.nodeType }),
        },
      }),
      // Update currentNode on WorkflowExecution
      this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          currentNode:
            nodeResult.status === 'running' ? nodeResult.nodeId : null,
        },
      }),
    ]);
  }

  /**
   * Get node executions for a workflow execution
   * Returns them in order of startedAt
   */
  async getNodeExecutions(executionId: string): Promise<
    Array<{
      nodeId: string;
      nodeName: string | null;
      nodeType: string | null;
      status: string;
      output: unknown;
      error: string | null;
      startedAt: Date | null;
      completedAt: Date | null;
      durationMs: number | null;
    }>
  > {
    return this.prisma.nodeExecution.findMany({
      where: { executionId },
      orderBy: { startedAt: 'asc' },
      select: {
        nodeId: true,
        nodeName: true,
        nodeType: true,
        status: true,
        output: true,
        error: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
      },
    });
  }

  /**
   * Get execution by ID
   * @throws NotFoundException if execution not found
   */
  async getExecution(executionId: string) {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    return execution;
  }

  /**
   * Find all active workflows for an organization
   */
  async findActiveWorkflows(
    organizationId: string,
  ): Promise<WorkflowWithDefinition[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    return workflows.map((w) => ({
      id: w.id,
      organizationId: w.organizationId,
      name: w.name,
      definition: w.definition as unknown as WorkflowDefinition,
      isActive: w.isActive,
    }));
  }
}
