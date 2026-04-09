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
import * as crypto from 'crypto';
import { QUEUES, WebhookProcessingJob } from '../queue/queues';
import { WebhookSecretsService } from './webhook-secrets.service';
import { WebhookRateLimit } from '../../shared/decorators/throttle.decorator';

interface GitHubWebhookPayload {
  action?: string;
  sender?: {
    login: string;
    id: number;
  };
  repository?: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
  pull_request?: {
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
  issue?: {
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    labels: Array<{ name: string }>;
  };
  comment?: {
    id: number;
    body: string;
    html_url: string;
    user: {
      login: string;
    };
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
  ref?: string;
  before?: string;
  after?: string;
}

@Controller('webhooks/github')
@WebhookRateLimit() // Higher throughput for webhook endpoints
export class GitHubWebhookController {
  private readonly logger = new Logger(GitHubWebhookController.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOK_PROCESSING)
    private readonly webhookQueue: Queue<WebhookProcessingJob>,
    private readonly webhookSecrets: WebhookSecretsService,
  ) {}

  /**
   * Handle GitHub webhooks with organization token
   *
   * URL: /webhooks/github/:token
   * The token identifies which organization this webhook belongs to.
   * This allows each organization to have their own webhook URL.
   *
   * Supported events:
   * - push
   * - pull_request
   * - pull_request_review
   * - issues
   * - issue_comment
   * - check_run
   * - check_suite
   */
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('token') token: string,
    @Req() req: RawBodyRequest<any>,
    @Headers() headers: Record<string, string>,
    @Body() payload: GitHubWebhookPayload,
  ) {
    // Find organization and get its webhook secret
    const orgData = await this.webhookSecrets.getOrganizationWithSecret(
      token,
      'github',
    );

    if (!orgData) {
      this.logger.warn(
        `Invalid webhook token/slug: ${token.substring(0, 8)}...`,
      );
      throw new NotFoundException('Invalid webhook token');
    }

    const { organizationId, secret: webhookSecret } = orgData;
    const eventType = headers['x-github-event'];
    const deliveryId = headers['x-github-delivery'];

    this.logger.log(
      `Received GitHub webhook for org ${organizationId}: ${eventType} (action: ${payload.action || 'N/A'}) [${deliveryId}]`,
    );

    // Verify webhook signature (mandatory if secret is configured)
    if (webhookSecret && req.rawBody) {
      const signature = headers['x-hub-signature-256'];

      if (!signature) {
        this.logger.warn(
          `Missing GitHub webhook signature for org ${organizationId}`,
        );
        throw new UnauthorizedException('Missing webhook signature');
      }

      const isValid = this.verifySignature(
        req.rawBody,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        this.logger.warn(
          `Invalid GitHub webhook signature for org ${organizationId}`,
        );
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Queue the webhook for processing with organization context
    await this.webhookQueue.add(
      'process',
      {
        type: 'github',
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
        jobId: deliveryId, // Prevent duplicate processing
      },
    );

    this.logger.log(`GitHub webhook queued: ${eventType}`);

    return { status: 'ok', message: 'Webhook received' };
  }

  /**
   * Verify webhook signature using HMAC-SHA256 with timing-safe comparison
   * Handles different buffer lengths safely to prevent timing attacks
   */
  private verifySignature(
    payload: Buffer,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      // Check length first to avoid timingSafeEqual throwing
      // but maintain constant time behavior
      if (signatureBuffer.length !== expectedBuffer.length) {
        // Do a fake comparison to maintain constant time
        crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Sanitize headers for storage
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const allowedHeaders = [
      'content-type',
      'x-github-event',
      'x-github-delivery',
      'x-github-hook-id',
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
