// Import and re-export Prisma's TaskStatus to ensure type compatibility
import { TaskStatus as PrismaTaskStatus } from '@prisma/client';
export const TaskStatus = PrismaTaskStatus;
export type TaskStatus = PrismaTaskStatus;

export enum TaskResultType {
  MERGE_REQUEST = 'merge_request',
  COMMENT = 'comment',
  MANUAL_INTERVENTION = 'manual_intervention',
}

export interface TaskResult {
  type: TaskResultType;
  mergeRequestUrl?: string;
  comment?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskAgentLog {
  agentName: string;
  action: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export class Task {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public title: string,
    public description: string | null,
    public status: TaskStatus,
    public readonly externalIssueId: string | null,
    public readonly externalIssueUrl: string | null,
    public result: TaskResult | null,
    public agentLogs: TaskAgentLog[],
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    organizationId: string;
    projectId: string;
    title: string;
    description?: string;
    externalIssueId?: string;
    externalIssueUrl?: string;
    createdBy: string;
  }): Task {
    return new Task(
      params.id,
      params.organizationId,
      params.projectId,
      params.title,
      params.description ?? null,
      TaskStatus.PENDING,
      params.externalIssueId ?? null,
      params.externalIssueUrl ?? null,
      null,
      [],
      params.createdBy,
      new Date(),
      new Date(),
    );
  }

  startAnalysis(): void {
    this.status = TaskStatus.ANALYZING;
    this.updatedAt = new Date();
  }

  startProcessing(): void {
    this.status = TaskStatus.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  moveToReview(): void {
    this.status = TaskStatus.REVIEW;
    this.updatedAt = new Date();
  }

  complete(result: TaskResult): void {
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.updatedAt = new Date();
  }

  fail(reason: string): void {
    this.status = TaskStatus.FAILED;
    this.result = {
      type: TaskResultType.MANUAL_INTERVENTION,
      reason,
    };
    this.updatedAt = new Date();
  }

  cancel(): void {
    this.status = TaskStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  addAgentLog(log: Omit<TaskAgentLog, 'timestamp'>): void {
    this.agentLogs.push({
      ...log,
      timestamp: new Date(),
    });
    this.updatedAt = new Date();
  }

  canBeProcessed(): boolean {
    return this.status === TaskStatus.PENDING;
  }

  canBeCancelled(): boolean {
    const cancellableStatuses: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.ANALYZING,
      TaskStatus.IN_PROGRESS,
    ];
    return cancellableStatuses.includes(this.status);
  }
}
