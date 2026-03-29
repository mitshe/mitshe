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
export class OnTaskCompletedHandler
  implements IEventHandler<TaskCompletedEvent>
{
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

      // Run side effects in parallel
      await Promise.allSettled([
        this.sendSlackNotification(event, task),
        this.updateJiraIssue(event, task),
      ]);

      this.logger.log(`TaskCompletedEvent handled for task ${event.taskId}`);
    } catch (error) {
      this.logger.error(
        `Error handling TaskCompletedEvent for task ${event.taskId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendSlackNotification(
    event: TaskCompletedEvent,
    task: {
      title: string;
      externalIssueId: string | null;
      project: { name: string } | null;
    },
  ): Promise<void> {
    try {
      const slackProvider =
        await this.adapterFactory.getDefaultNotificationProvider(
          event.organizationId,
        );

      if (!slackProvider) {
        this.logger.debug(
          `No Slack provider configured for org ${event.organizationId}`,
        );
        return;
      }

      const resultType =
        (event.result as unknown as Record<string, unknown>)?.type ||
        'completed';
      const projectName = task.project?.name || 'Unknown Project';
      const issueRef = task.externalIssueId ? ` (${task.externalIssueId})` : '';

      await slackProvider.send(
        { type: 'channel', id: 'default' }, // Will use default channel from config
        {
          title: `Task Completed: ${task.title}${issueRef}`,
          body: `The task in project "${projectName}" has been completed.\n\nResult type: ${resultType}`,
          severity: 'success',
        },
      );

      this.logger.log(`Slack notification sent for task ${event.taskId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to send Slack notification for task ${event.taskId}: ${error.message}`,
      );
    }
  }

  private async updateJiraIssue(
    event: TaskCompletedEvent,
    task: { externalIssueId: string | null; externalSource: string | null },
  ): Promise<void> {
    if (!task.externalIssueId || !task.externalSource) {
      return;
    }

    // Only handle JIRA issues for now
    if (task.externalSource !== 'JIRA') {
      return;
    }

    try {
      const jiraAdapter = await this.adapterFactory.getDefaultIssueTracker(
        event.organizationId,
      );

      if (!jiraAdapter || jiraAdapter.getProviderType() !== 'jira') {
        this.logger.debug(
          `No JIRA adapter configured for org ${event.organizationId}`,
        );
        return;
      }

      // Add comment to JIRA issue
      const resultType =
        (event.result as unknown as Record<string, unknown>)?.type ||
        'completed';
      const comment = `Task processed by AI Tasks Platform.\n\nResult: ${resultType}\n\nProcessed at: ${event.occurredAt.toISOString()}`;

      await jiraAdapter.addComment(task.externalIssueId, comment);

      this.logger.log(`JIRA comment added for issue ${task.externalIssueId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update JIRA issue ${task.externalIssueId}: ${error.message}`,
      );
    }
  }
}
