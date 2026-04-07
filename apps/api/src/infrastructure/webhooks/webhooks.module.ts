import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queues';
import { SharedModule } from '../../shared/shared.module';

import { JiraWebhookController } from './jira-webhook.controller';
import { GitLabWebhookController } from './gitlab-webhook.controller';
import { GitHubWebhookController } from './github-webhook.controller';
import { TrelloWebhookController } from './trello-webhook.controller';
import { WebhookSecretsService } from './webhook-secrets.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WEBHOOK_PROCESSING }),
    SharedModule,
  ],
  controllers: [
    JiraWebhookController,
    GitLabWebhookController,
    GitHubWebhookController,
    TrelloWebhookController,
  ],
  providers: [WebhookSecretsService],
  exports: [WebhookSecretsService],
})
export class WebhooksModule {}
