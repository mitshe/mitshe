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
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: Record<string, unknown>;
}

export interface WorkflowNodeExecutionPayload {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface IntegrationEventPayload {
  type: "jira" | "github" | "gitlab" | "slack";
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface SessionStatusPayload {
  sessionId: string;
  status: string;
  error?: string;
}

export interface SessionMessagePayload {
  sessionId: string;
  role: string;
  content: string;
}

export interface SessionEventPayload {
  sessionId: string;
  event: Record<string, unknown>;
}

export interface SessionMessageCompletePayload {
  sessionId: string;
}

export interface SessionErrorPayload {
  sessionId: string;
  error: string;
}

export type SocketEvent =
  | "task:update"
  | "task:completed"
  | "task:failed"
  | "agent:log"
  | "workflow:execution:started"
  | "workflow:execution:completed"
  | "workflow:execution:failed"
  | "workflow:execution:cancelled"
  | "workflow:node:update"
  | "integration:event"
  | "notification"
  | "session:status"
  | "session:message"
  | "session:event"
  | "session:message-complete"
  | "session:error";

export interface SocketEventPayloads {
  "task:update": TaskUpdatePayload;
  "task:completed": { taskId: string; result: Record<string, unknown> };
  "task:failed": { taskId: string; reason: string };
  "agent:log": {
    taskId: string;
    agentName: string;
    action: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
  "workflow:execution:started": WorkflowExecutionPayload;
  "workflow:execution:completed": WorkflowExecutionPayload;
  "workflow:execution:failed": WorkflowExecutionPayload;
  "workflow:execution:cancelled": WorkflowExecutionPayload;
  "workflow:node:update": WorkflowNodeExecutionPayload;
  "integration:event": IntegrationEventPayload;
  notification: NotificationPayload;
  "session:status": SessionStatusPayload;
  "session:message": SessionMessagePayload;
  "session:event": SessionEventPayload;
  "session:message-complete": SessionMessageCompletePayload;
  "session:error": SessionErrorPayload;
}
