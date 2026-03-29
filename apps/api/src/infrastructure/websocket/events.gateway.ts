import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../persistence/prisma/prisma.service';

// Event type definitions
export interface TaskUpdatePayload {
  taskId: string;
  status: string;
  message?: string;
  agentName?: string;
  progress?: number;
}

export interface WorkflowExecutionPayload {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowNodeExecutionPayload {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface IntegrationEventPayload {
  type: 'jira' | 'github' | 'gitlab' | 'slack';
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly clerkSecretKey: string;
  private connectedClients = new Map<
    string,
    {
      organizationId?: string;
      userId?: string;
      authenticated: boolean;
      rooms: Set<string>;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clerkSecretKey =
      this.configService.get<string>('CLERK_SECRET_KEY') || '';
    if (!this.clerkSecretKey) {
      this.logger.warn(
        'CLERK_SECRET_KEY not configured - WebSocket auth will be disabled',
      );
    }
  }

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, {
      authenticated: false,
      rooms: new Set(),
    });
    this.logger.log(
      `Client connected: ${client.id} (${this.connectedClients.size} total)`,
    );
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} (${this.connectedClients.size} remaining)`,
    );
  }

  /**
   * Authenticate and join organization room
   * Validates Clerk JWT token and verifies organization membership
   */
  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { organizationId: string; token?: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) {
      return { event: 'error', data: { message: 'Client not found' } };
    }

    // Validate token if Clerk is configured
    if (this.clerkSecretKey && data.token) {
      try {
        const payload = await verifyToken(data.token, {
          secretKey: this.clerkSecretKey,
        });

        // Verify the token's organization matches the requested organization
        if (payload.org_id && payload.org_id !== data.organizationId) {
          this.logger.warn(
            `Client ${client.id} token org (${payload.org_id}) doesn't match requested org (${data.organizationId})`,
          );
          return {
            event: 'error',
            data: { message: 'Organization mismatch' },
          };
        }

        // Token is valid - update client data
        clientData.userId = payload.sub;
        clientData.authenticated = true;
      } catch (error) {
        this.logger.warn(`Client ${client.id} authentication failed: ${error}`);
        return {
          event: 'error',
          data: { message: 'Invalid or expired token' },
        };
      }
    } else if (this.clerkSecretKey) {
      // Clerk is configured but no token provided
      this.logger.warn(`Client ${client.id} attempted auth without token`);
      return {
        event: 'error',
        data: { message: 'Authentication token required' },
      };
    } else {
      // Clerk not configured - allow without token (dev mode)
      clientData.authenticated = true;
    }

    // Join organization room
    clientData.organizationId = data.organizationId;
    void client.join(`org:${data.organizationId}`);
    clientData.rooms.add(`org:${data.organizationId}`);

    this.logger.log(
      `[WS AUTH] Client ${client.id} authenticated and joined room: org:${data.organizationId}`,
    );
    return {
      event: 'authenticated',
      data: { organizationId: data.organizationId },
    };
  }

  /**
   * Check if a client is authenticated before allowing subscription
   */
  private isClientAuthenticated(client: Socket): boolean {
    const clientData = this.connectedClients.get(client.id);
    return clientData?.authenticated ?? false;
  }

  /**
   * Client subscribes to task updates for an organization
   * Requires authentication
   */
  @SubscribeMessage('subscribe:organization')
  handleSubscribeOrganization(
    @ConnectedSocket() client: Socket,
    @MessageBody() organizationId: string,
  ) {
    if (!this.isClientAuthenticated(client)) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    // Verify client is authenticated for this organization
    const clientData = this.connectedClients.get(client.id);
    if (clientData?.organizationId !== organizationId) {
      return {
        event: 'error',
        data: { message: 'Not authorized for this organization' },
      };
    }

    void client.join(`org:${organizationId}`);
    this.logger.log(`Client ${client.id} subscribed to org:${organizationId}`);
    return { event: 'subscribed', data: { organizationId } };
  }

  /**
   * Client subscribes to a specific task
   * Requires authentication and organization ownership verification
   */
  @SubscribeMessage('subscribe:task')
  async handleSubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() taskId: string,
  ) {
    if (!this.isClientAuthenticated(client)) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.organizationId) {
      return { event: 'error', data: { message: 'Organization not set' } };
    }

    // Verify task belongs to client's organization
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: clientData.organizationId },
      select: { id: true },
    });

    if (!task) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to task ${taskId} not in their org`,
      );
      return {
        event: 'error',
        data: { message: 'Task not found or not authorized' },
      };
    }

    void client.join(`task:${taskId}`);
    clientData.rooms.add(`task:${taskId}`);
    this.logger.log(`Client ${client.id} subscribed to task:${taskId}`);
    return { event: 'subscribed', data: { taskId } };
  }

  /**
   * Client unsubscribes from a task
   */
  @SubscribeMessage('unsubscribe:task')
  handleUnsubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() taskId: string,
  ) {
    void client.leave(`task:${taskId}`);
    this.logger.log(`Client ${client.id} unsubscribed from task:${taskId}`);
    return { event: 'unsubscribed', data: { taskId } };
  }

  /**
   * Emit task status update to all subscribers
   */
  emitTaskUpdate(organizationId: string, payload: TaskUpdatePayload) {
    // Emit to organization room
    this.server.to(`org:${organizationId}`).emit('task:update', payload);

    // Emit to specific task room
    this.server.to(`task:${payload.taskId}`).emit('task:update', payload);

    this.logger.debug(
      `Emitted task update: ${payload.taskId} -> ${payload.status}`,
    );
  }

  /**
   * Emit agent activity log
   */
  emitAgentLog(
    organizationId: string,
    taskId: string,
    log: {
      agentName: string;
      action: string;
      details?: Record<string, unknown>;
    },
  ) {
    const payload = {
      taskId,
      ...log,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`task:${taskId}`).emit('agent:log', payload);
  }

  /**
   * Emit task completion
   */
  emitTaskCompleted(
    organizationId: string,
    taskId: string,
    result: {
      type: string;
      mergeRequestUrl?: string;
      comment?: string;
    },
  ) {
    const payload = { taskId, result };

    this.server.to(`org:${organizationId}`).emit('task:completed', payload);
    this.server.to(`task:${taskId}`).emit('task:completed', payload);
  }

  /**
   * Emit task failure
   */
  emitTaskFailed(organizationId: string, taskId: string, reason: string) {
    const payload = { taskId, reason };

    this.server.to(`org:${organizationId}`).emit('task:failed', payload);
    this.server.to(`task:${taskId}`).emit('task:failed', payload);
  }

  /**
   * Generic method to emit events to organization room
   */
  emitToOrganization(
    organizationId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(`org:${organizationId}`).emit(event, payload);
    this.logger.debug(`Emitted ${event} to org:${organizationId}`);
  }

  /**
   * Subscribe client to workflow executions
   * Requires authentication and organization ownership verification
   */
  @SubscribeMessage('subscribe:workflow')
  async handleSubscribeWorkflow(
    @ConnectedSocket() client: Socket,
    @MessageBody() workflowId: string,
  ) {
    if (!this.isClientAuthenticated(client)) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.organizationId) {
      return { event: 'error', data: { message: 'Organization not set' } };
    }

    // Verify workflow belongs to client's organization
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: clientData.organizationId },
      select: { id: true },
    });

    if (!workflow) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to workflow ${workflowId} not in their org`,
      );
      return {
        event: 'error',
        data: { message: 'Workflow not found or not authorized' },
      };
    }

    void client.join(`workflow:${workflowId}`);
    clientData.rooms.add(`workflow:${workflowId}`);
    this.logger.log(`Client ${client.id} subscribed to workflow:${workflowId}`);
    return { event: 'subscribed', data: { workflowId } };
  }

  /**
   * Subscribe client to specific workflow execution
   * Requires authentication and organization ownership verification
   */
  @SubscribeMessage('subscribe:execution')
  async handleSubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() executionId: string,
  ) {
    if (!this.isClientAuthenticated(client)) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.organizationId) {
      return { event: 'error', data: { message: 'Organization not set' } };
    }

    // Verify execution belongs to client's organization via workflow
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflow: { organizationId: clientData.organizationId },
      },
      select: { id: true },
    });

    if (!execution) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to execution ${executionId} not in their org`,
      );
      return {
        event: 'error',
        data: { message: 'Execution not found or not authorized' },
      };
    }

    void client.join(`execution:${executionId}`);
    clientData.rooms.add(`execution:${executionId}`);
    this.logger.log(
      `Client ${client.id} subscribed to execution:${executionId}`,
    );
    return { event: 'subscribed', data: { executionId } };
  }

  /**
   * Emit workflow node execution update
   */
  async emitWorkflowNodeUpdate(
    organizationId: string,
    executionId: string,
    payload: WorkflowNodeExecutionPayload,
  ) {
    const rooms = [
      `org:${organizationId}`,
      `execution:${executionId}`,
      `workflow:${payload.workflowId}`,
    ];

    // Check how many clients are in each room
    const roomSizes = await Promise.all(
      rooms.map(async (room) => {
        const sockets = await this.server.in(room).fetchSockets();
        return `${room}(${sockets.length})`;
      }),
    );

    this.logger.log(
      `[WS EMIT] workflow:node:update | nodeId=${payload.nodeId} status=${payload.status} | rooms: ${roomSizes.join(', ')}`,
    );

    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:node:update', payload);
    this.server
      .to(`execution:${executionId}`)
      .emit('workflow:node:update', payload);
    this.server
      .to(`workflow:${payload.workflowId}`)
      .emit('workflow:node:update', payload);
  }

  /**
   * Emit workflow execution started event
   */
  emitWorkflowExecutionStarted(
    organizationId: string,
    payload: WorkflowExecutionPayload,
  ) {
    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:execution:started', payload);
    this.server
      .to(`workflow:${payload.workflowId}`)
      .emit('workflow:execution:started', payload);
    this.logger.debug(`Workflow execution started: ${payload.executionId}`);
  }

  /**
   * Emit workflow execution completed event
   */
  emitWorkflowExecutionCompleted(
    organizationId: string,
    payload: WorkflowExecutionPayload & { output?: Record<string, unknown> },
  ) {
    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:execution:completed', payload);
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('workflow:execution:completed', payload);
    this.server
      .to(`workflow:${payload.workflowId}`)
      .emit('workflow:execution:completed', payload);
    this.logger.debug(`Workflow execution completed: ${payload.executionId}`);
  }

  /**
   * Emit workflow execution failed event
   */
  emitWorkflowExecutionFailed(
    organizationId: string,
    payload: WorkflowExecutionPayload,
  ) {
    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:execution:failed', payload);
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('workflow:execution:failed', payload);
    this.server
      .to(`workflow:${payload.workflowId}`)
      .emit('workflow:execution:failed', payload);
    this.logger.warn(
      `Workflow execution failed: ${payload.executionId} - ${payload.error}`,
    );
  }

  /**
   * Emit workflow execution cancelled event
   */
  emitWorkflowExecutionCancelled(
    organizationId: string,
    payload: WorkflowExecutionPayload,
  ) {
    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:execution:cancelled', payload);
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('workflow:execution:cancelled', payload);
    this.server
      .to(`workflow:${payload.workflowId}`)
      .emit('workflow:execution:cancelled', payload);
    this.logger.debug(`Workflow execution cancelled: ${payload.executionId}`);
  }

  /**
   * Emit integration event (JIRA, GitHub, GitLab, Slack)
   */
  emitIntegrationEvent(
    organizationId: string,
    payload: IntegrationEventPayload,
  ) {
    this.server.to(`org:${organizationId}`).emit('integration:event', payload);
    this.logger.debug(`Integration event: ${payload.type}:${payload.event}`);
  }

  /**
   * Emit notification to organization
   */
  emitNotification(organizationId: string, payload: NotificationPayload) {
    this.server.to(`org:${organizationId}`).emit('notification', payload);
    this.logger.debug(`Notification: ${payload.type} - ${payload.title}`);
  }

  /**
   * Unsubscribe from workflow
   */
  @SubscribeMessage('unsubscribe:workflow')
  handleUnsubscribeWorkflow(
    @ConnectedSocket() client: Socket,
    @MessageBody() workflowId: string,
  ) {
    void client.leave(`workflow:${workflowId}`);
    this.logger.log(
      `Client ${client.id} unsubscribed from workflow:${workflowId}`,
    );
    return { event: 'unsubscribed', data: { workflowId } };
  }

  /**
   * Unsubscribe from execution
   */
  @SubscribeMessage('unsubscribe:execution')
  handleUnsubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() executionId: string,
  ) {
    void client.leave(`execution:${executionId}`);
    this.logger.log(
      `Client ${client.id} unsubscribed from execution:${executionId}`,
    );
    return { event: 'unsubscribed', data: { executionId } };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      authenticatedConnections: Array.from(
        this.connectedClients.values(),
      ).filter((c) => c.organizationId).length,
    };
  }
}
