import { TaskResult, TaskStatus } from '../entities/task.entity';

/**
 * Base class for all task-related domain events
 */
abstract class TaskEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly taskId: string,
    public readonly organizationId: string,
  ) {
    this.occurredAt = new Date();
  }
}

/**
 * Emitted when a new task is created
 */
export class TaskCreatedEvent extends TaskEvent {
  constructor(
    taskId: string,
    organizationId: string,
    public readonly projectId: string | null,
    public readonly title: string,
    public readonly externalIssueId: string | null,
  ) {
    super(taskId, organizationId);
  }
}

/**
 * Emitted when task status changes
 */
export class TaskStatusChangedEvent extends TaskEvent {
  constructor(
    taskId: string,
    organizationId: string,
    public readonly previousStatus: TaskStatus,
    public readonly newStatus: TaskStatus,
  ) {
    super(taskId, organizationId);
  }
}

/**
 * Emitted when task processing is complete
 */
export class TaskCompletedEvent extends TaskEvent {
  constructor(
    taskId: string,
    organizationId: string,
    public readonly result: TaskResult,
  ) {
    super(taskId, organizationId);
  }
}

/**
 * Emitted when task processing fails
 */
export class TaskFailedEvent extends TaskEvent {
  constructor(
    taskId: string,
    organizationId: string,
    public readonly reason: string,
    public readonly error?: string,
  ) {
    super(taskId, organizationId);
  }
}
