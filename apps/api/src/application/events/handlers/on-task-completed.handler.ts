import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskCompletedEvent } from '../../../domain/events/task.events';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import { QUEUES, NotificationJob } from '../../../infrastructure/queue/queues';

/**
 * Handles TaskCompletedEvent
 * - Sends Slack notification
 * - Updates JIRA issue status (if linked)
 * - Adds JIRA comment with result summary
 */
@EventsHandler(TaskCompletedEvent)
export class OnTaskCompletedHandler implements IEventHandler<TaskCompletedEvent> {
  private readonly logger = new Logger(OnTaskCompletedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationQueue: Queue<NotificationJob>,
  ) {}

  async handle(event: TaskCompletedEvent): Promise<void> {
    this.logger.log(`Handling TaskCompletedEvent for task ${event.taskId}`);

    try {
      // Get task details
      const task = await this.prisma.task.findUnique({
        where: { id: event.taskId },
        include: { project: true },
      });

      if (!task) {
        this.logger.warn(`Task ${event.taskId} not found`);
        return;
      }

      await Promise.allSettled([
        this.sendNotification(event, task),
        this.updateIssueTracker(event, task),
      ]);

      this.logger.log(`TaskCompletedEvent handled for task ${event.taskId}`);
    } catch (error) {
      this.logger.error(
        `Error handling TaskCompletedEvent for task ${event.taskId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async sendNotification(
    event: TaskCompletedEvent,
    task: {
      title: string;
      externalIssueId: string | null;
      project: { name: string } | null;
    },
  ): Promise<void> {
    try {
      const notificationProvider =
        await this.adapterFactory.getDefaultNotificationProvider(
          event.organizationId,
        );

      if (!notificationProvider) {
        this.logger.debug(
          `No notification provider configured for org ${event.organizationId}`,
        );
        return;
      }

      const resultType =
        (event.result as unknown as Record<string, unknown>)?.type ||
        'completed';
      const projectName = task.project?.name || 'Unknown Project';
      const issueRef = task.externalIssueId ? ` (${task.externalIssueId})` : '';

      await notificationProvider.send(
        { type: 'channel', id: 'default' },
        {
          title: `Task Completed: ${task.title}${issueRef}`,
          body: `The task in project "${projectName}" has been completed.\n\nResult type: ${resultType}`,
          severity: 'success',
        },
      );

      this.logger.log(`Notification sent for task ${event.taskId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to send notification for task ${event.taskId}: ${(error as Error).message}`,
      );
    }
  }

  private async updateIssueTracker(
    event: TaskCompletedEvent,
    task: { externalIssueId: string | null; externalSource: string | null },
  ): Promise<void> {
    if (!task.externalIssueId || !task.externalSource) {
      return;
    }

    try {
      const issueTracker = await this.adapterFactory.getDefaultIssueTracker(
        event.organizationId,
      );

      if (!issueTracker) {
        this.logger.debug(
          `No issue tracker configured for org ${event.organizationId}`,
        );
        return;
      }

      const resultType =
        (event.result as unknown as Record<string, unknown>)?.type ||
        'completed';
      const comment = `Task processed by mitshe.\n\nResult: ${resultType}\n\nProcessed at: ${event.occurredAt.toISOString()}`;

      await issueTracker.addComment(task.externalIssueId, comment);

      this.logger.log(
        `Issue tracker comment added for ${task.externalIssueId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update issue ${task.externalIssueId}: ${(error as Error).message}`,
      );
    }
  }
}
