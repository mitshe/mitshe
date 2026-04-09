import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
  Param,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { timingSafeEqual } from 'crypto';
import { QUEUES, WebhookProcessingJob } from '../queue/queues';
import { WebhookSecretsService } from './webhook-secrets.service';
import { WebhookRateLimit } from '../../shared/decorators/throttle.decorator';

interface GitLabWebhookPayload {
  object_kind: string;
  event_type?: string;
  project?: {
    id: number;
    name: string;
    web_url: string;
    path_with_namespace: string;
  };
  object_attributes?: Record<string, unknown>;
  user?: {
    id: number;
    username: string;
    name: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  merge_request?: Record<string, unknown>;
}

@Controller('webhooks/gitlab')
@WebhookRateLimit() // Higher throughput for webhook endpoints
export class GitLabWebhookController {
  private readonly logger = new Logger(GitLabWebhookController.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOK_PROCESSING)
    private readonly webhookQueue: Queue<WebhookProcessingJob>,
    private readonly webhookSecrets: WebhookSecretsService,
  ) {}

  /**
   * Handle GitLab webhooks with organization token
   *
   * URL: /webhooks/gitlab/:token
   * The token identifies which organization this webhook belongs to.
   * This allows each organization to have their own webhook URL.
   *
   * Supported events:
   * - Push Hook
   * - Merge Request Hook
   * - Pipeline Hook
   * - Note Hook (comments)
   * - Issue Hook
   */
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('token') token: string,
    @Req() req: RawBodyRequest<any>,
    @Headers() headers: Record<string, string>,
    @Body() payload: GitLabWebhookPayload,
  ) {
    // Find organization and get its webhook secret
    const orgData = await this.webhookSecrets.getOrganizationWithSecret(
      token,
      'gitlab',
    );

    if (!orgData) {
      this.logger.warn(
        `Invalid webhook token/slug: ${token.substring(0, 8)}...`,
      );
      throw new NotFoundException('Invalid webhook token');
    }

    const { organizationId, secret: webhookSecret } = orgData;
    const eventType = headers['x-gitlab-event'];
    const objectKind = payload.object_kind;

    this.logger.log(
      `Received GitLab webhook for org ${organizationId}: ${eventType} (${objectKind})`,
    );

    // Verify webhook secret token (mandatory if secret is configured)
    // GitLab sends the secret in X-Gitlab-Token header
    if (webhookSecret) {
      const receivedToken = headers['x-gitlab-token'] || '';

      if (!receivedToken) {
        this.logger.warn(
          `Missing GitLab webhook token for org ${organizationId}`,
        );
        throw new UnauthorizedException('Missing webhook token');
      }

      // Use timing-safe comparison
      const isValid =
        receivedToken.length === webhookSecret.length &&
        timingSafeEqual(Buffer.from(receivedToken), Buffer.from(webhookSecret));

      if (!isValid) {
        this.logger.warn(
          `Invalid GitLab webhook token for org ${organizationId}`,
        );
        throw new UnauthorizedException('Invalid webhook token');
      }
    }

    // Queue the webhook for processing with organization context
    await this.webhookQueue.add(
      'process',
      {
        type: 'gitlab',
        payload: {
          ...(payload as unknown as Record<string, unknown>),
          _organizationId: organizationId, // Add org context
        },
        headers: this.sanitizeHeaders(headers),
        timestamp: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    this.logger.log(`GitLab webhook queued: ${eventType}`);

    return { status: 'ok', message: 'Webhook received' };
  }

  /**
   * Sanitize headers for storage
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const allowedHeaders = [
      'content-type',
      'x-gitlab-event',
      'x-gitlab-event-uuid',
      'user-agent',
    ];

    return Object.keys(headers)
      .filter((key) => allowedHeaders.includes(key.toLowerCase()))
      .reduce(
        (acc, key) => {
          acc[key.toLowerCase()] = headers[key];
          return acc;
        },
        {} as Record<string, string>,
      );
  }
}
