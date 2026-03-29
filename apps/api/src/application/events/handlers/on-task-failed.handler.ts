import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TaskFailedEvent } from '../../../domain/events/task.events';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';

/**
 * Handles TaskFailedEvent
 * - Sends Slack notification about failure
 * - Adds JIRA comment with failure reason
 */
@EventsHandler(TaskFailedEvent)
export class OnTaskFailedHandler implements IEventHandler<TaskFailedEvent> {
  private readonly logger = new Logger(OnTaskFailedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
  ) {}

  async handle(event: TaskFailedEvent): Promise<void> {
    this.logger.log(`Handling TaskFailedEvent for task ${event.taskId}`);

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

      this.logger.log(`TaskFailedEvent handled for task ${event.taskId}`);
    } catch (error) {
      this.logger.error(
        `Error handling TaskFailedEvent for task ${event.taskId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendSlackNotification(
    event: TaskFailedEvent,
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

      const projectName = task.project?.name || 'Unknown Project';
      const issueRef = task.externalIssueId ? ` (${task.externalIssueId})` : '';

      await slackProvider.send(
        { type: 'channel', id: 'default' },
        {
          title: `Task Failed: ${task.title}${issueRef}`,
          body: `The task in project "${projectName}" has failed.\n\nReason: ${event.reason}${event.error ? `\n\nError: ${event.error}` : ''}`,
          severity: 'error',
        },
      );

      this.logger.log(
        `Slack failure notification sent for task ${event.taskId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send Slack notification for task ${event.taskId}: ${error.message}`,
      );
    }
  }

  private async updateJiraIssue(
    event: TaskFailedEvent,
    task: { externalIssueId: string | null; externalSource: string | null },
  ): Promise<void> {
    if (!task.externalIssueId || !task.externalSource) {
      return;
    }

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

      const comment = `Task processing failed in AI Tasks Platform.\n\nReason: ${event.reason}${event.error ? `\n\nError: ${event.error}` : ''}\n\nFailed at: ${event.occurredAt.toISOString()}\n\nManual intervention may be required.`;

      await jiraAdapter.addComment(task.externalIssueId, comment);

      this.logger.log(
        `JIRA failure comment added for issue ${task.externalIssueId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update JIRA issue ${task.externalIssueId}: ${error.message}`,
      );
    }
  }
}
