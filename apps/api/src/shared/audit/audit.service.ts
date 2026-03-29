import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';
import { Request } from 'express';

export interface AuditContext {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit entry
   */
  async log(context: AuditContext, entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          userId: context.userId,
          userEmail: context.userEmail,
          apiKeyId: context.apiKeyId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          description: entry.description,
          metadata: entry.metadata as Prisma.InputJsonValue | undefined,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error(
        `Failed to write audit log: ${(error as Error).message}`,
        {
          context,
          entry,
        },
      );
    }
  }

  /**
   * Extract audit context from Express request
   */
  extractContext(req: Request): Partial<AuditContext> {
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;

    return {
      userId: user?.id || user?.userId,
      userEmail: user?.email || user?.emailAddresses?.[0]?.emailAddress,
      apiKeyId: apiKey?.id,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }

  private getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress;
  }

  // =========================================================================
  // Convenience Methods
  // =========================================================================

  /**
   * Log a CREATE action
   */
  async logCreate(
    context: AuditContext,
    resourceType: string,
    resourceId: string,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.CREATE,
      resourceType,
      resourceId,
      description: description || `Created ${resourceType}`,
      metadata,
    });
  }

  /**
   * Log an UPDATE action
   */
  async logUpdate(
    context: AuditContext,
    resourceType: string,
    resourceId: string,
    changes?: { before?: unknown; after?: unknown },
    description?: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.UPDATE,
      resourceType,
      resourceId,
      description: description || `Updated ${resourceType}`,
      metadata: changes ? { changes } : undefined,
    });
  }

  /**
   * Log a DELETE action
   */
  async logDelete(
    context: AuditContext,
    resourceType: string,
    resourceId: string,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.DELETE,
      resourceType,
      resourceId,
      description: description || `Deleted ${resourceType}`,
      metadata,
    });
  }

  /**
   * Log integration connection
   */
  async logIntegrationConnected(
    context: AuditContext,
    integrationType: string,
    integrationId: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.INTEGRATION_CONNECTED,
      resourceType: 'integration',
      resourceId: integrationId,
      description: `Connected ${integrationType} integration`,
      metadata: { type: integrationType },
    });
  }

  /**
   * Log integration disconnection
   */
  async logIntegrationDisconnected(
    context: AuditContext,
    integrationType: string,
    integrationId: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.INTEGRATION_DISCONNECTED,
      resourceType: 'integration',
      resourceId: integrationId,
      description: `Disconnected ${integrationType} integration`,
      metadata: { type: integrationType },
    });
  }

  /**
   * Log workflow execution
   */
  async logWorkflowStarted(
    context: AuditContext,
    workflowId: string,
    executionId: string,
    workflowName?: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.WORKFLOW_STARTED,
      resourceType: 'workflow_execution',
      resourceId: executionId,
      description: `Started workflow: ${workflowName || workflowId}`,
      metadata: { workflowId, executionId },
    });
  }

  /**
   * Log workflow completion
   */
  async logWorkflowCompleted(
    context: AuditContext,
    workflowId: string,
    executionId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    await this.log(context, {
      action: success
        ? AuditAction.WORKFLOW_COMPLETED
        : AuditAction.WORKFLOW_FAILED,
      resourceType: 'workflow_execution',
      resourceId: executionId,
      description: success ? 'Workflow completed' : 'Workflow failed',
      metadata: { workflowId, executionId },
      success,
      errorMessage: error,
    });
  }

  /**
   * Log API key usage
   */
  async logApiKeyUsed(
    context: AuditContext,
    apiKeyId: string,
    endpoint: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.API_KEY_USED,
      resourceType: 'api_key',
      resourceId: apiKeyId,
      description: `API key used for ${endpoint}`,
      metadata: { endpoint },
    });
  }

  /**
   * Log settings change
   */
  async logSettingsChanged(
    context: AuditContext,
    settingName: string,
    before?: unknown,
    after?: unknown,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.SETTINGS_CHANGED,
      resourceType: 'settings',
      description: `Changed setting: ${settingName}`,
      metadata: { setting: settingName, before, after },
    });
  }

  // =========================================================================
  // Query Methods
  // =========================================================================

  /**
   * Get audit logs for an organization
   */
  async getAuditLogs(
    organizationId: string,
    options?: {
      userId?: string;
      action?: AuditAction;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { organizationId };

    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = options.action;
    if (options?.resourceType) where.resourceType = options.resourceType;
    if (options?.resourceId) where.resourceId = options.resourceId;

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    organizationId: string,
    resourceType: string,
    resourceId: string,
    limit = 100,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    organizationId: string,
    userId: string,
    days = 30,
    limit = 100,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
