/**
 * Queue Definitions
 */

export const QUEUES = {
  TASK_PROCESSING: 'task-processing',
  WEBHOOK_PROCESSING: 'webhook-processing',
  NOTIFICATIONS: 'notifications',
  POLLING: 'polling',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// Job Types
export interface TaskProcessingJob {
  type: 'process' | 'analyze' | 'complete' | 'fail';
  taskId: string;
  organizationId: string;
  workflowExecutionId?: string;
  payload?: Record<string, unknown>;
}

export interface WebhookProcessingJob {
  type: 'jira' | 'gitlab' | 'github' | 'clerk' | 'trello';
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  timestamp: string;
}

export interface PollingJob {
  workflowId: string;
  organizationId: string;
  triggerNodeId: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  lastPolledAt?: string;
}

export interface NotificationJob {
  type: 'slack' | 'email' | 'teams';
  organizationId: string;
  recipient: {
    type: 'user' | 'channel' | 'email';
    id: string;
  };
  message: {
    title: string;
    body: string;
    url?: string;
    severity?: 'info' | 'success' | 'warning' | 'error';
  };
}
