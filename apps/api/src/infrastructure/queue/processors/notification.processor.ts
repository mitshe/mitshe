import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, NotificationJob } from '../queues';
import { AdapterFactoryService } from '../../adapters/adapter-factory.service';
import { NotificationMessage } from '../../../ports/notification.port';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly adapterFactory: AdapterFactoryService) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const { type, organizationId, recipient, message } = job.data;

    this.logger.log(
      `Processing ${type} notification for ${recipient.type}:${recipient.id}`,
    );

    try {
      switch (type) {
        case 'slack':
          await this.sendSlackNotification(organizationId, recipient, message);
          break;

        case 'email':
          this.sendEmailNotification(organizationId, recipient, message);
          break;

        case 'teams':
          this.sendTeamsNotification(organizationId, recipient, message);
          break;

        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error sending ${type} notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async sendSlackNotification(
    organizationId: string,
    recipient: { type: string; id: string },
    message: { title: string; body: string; url?: string; severity?: string },
  ): Promise<void> {
    this.logger.log(
      `Sending Slack notification to ${recipient.type}:${recipient.id}`,
    );

    // Get the Slack provider for this organization
    const slackProvider =
      await this.adapterFactory.getDefaultNotificationProvider(organizationId);

    if (!slackProvider) {
      this.logger.warn(
        `No Slack integration configured for organization ${organizationId}`,
      );
      throw new Error('No Slack integration configured');
    }

    // Convert to NotificationMessage format
    const notificationMessage: NotificationMessage = {
      title: message.title,
      body: message.body,
      url: message.url,
      severity:
        (message.severity as 'info' | 'success' | 'warning' | 'error') ||
        'info',
    };

    // Send using the adapter
    const result = await slackProvider.send(
      {
        type: recipient.type as 'channel' | 'user' | 'email' | 'webhook',
        id: recipient.id,
      },
      notificationMessage,
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send Slack notification');
    }

    this.logger.log(
      `Slack notification sent successfully (messageId: ${result.messageId})`,
    );
  }

  private sendEmailNotification(
    _organizationId: string,
    recipient: { type: string; id: string },
    message: { title: string; body: string; url?: string; severity?: string },
  ): void {
    this.logger.log(`Sending email notification to ${recipient.id}`);

    // Email notifications require an email service integration (SendGrid, SES, etc.)
    // This is not implemented in the current adapter architecture
    // For now, log that email is not configured
    this.logger.warn(
      `Email notifications are not configured. Would send to: ${recipient.id}`,
    );
    this.logger.log(`Email content: ${message.title} - ${message.body}`);

    // In production, this should throw an error if email is required
    // throw new Error('Email notifications not configured');
  }

  private sendTeamsNotification(
    _organizationId: string,
    recipient: { type: string; id: string },
    message: { title: string; body: string; url?: string; severity?: string },
  ): void {
    this.logger.log(
      `Sending Teams notification to ${recipient.type}:${recipient.id}`,
    );

    // Teams adapter is not yet implemented in AdapterFactoryService
    // For now, log that Teams is not configured
    this.logger.warn(
      `Teams notifications are not yet implemented. Would send to: ${recipient.id}`,
    );
    this.logger.log(`Teams content: ${message.title} - ${message.body}`);

    // In production, this should throw an error if Teams is required
    // throw new Error('Teams notifications not configured');
  }
}
