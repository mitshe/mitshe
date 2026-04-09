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

interface JiraWebhookPayload {
  webhookEvent: string;
  timestamp: number;
  user?: {
    accountId?: string;
    displayName?: string;
  };
  issue?: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: {
        name: string;
        statusCategory: {
          key: string;
        };
      };
      project: {
        key: string;
        name: string;
      };
      assignee?: {
        accountId: string;
        displayName: string;
      };
      labels?: string[];
    };
  };
  changelog?: {
    id: string;
    items: Array<{
      field: string;
      fieldtype: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  };
  comment?: {
    id: string;
    author: {
      displayName: string;
    };
    body: string;
    created: string;
  };
}

@Controller('webhooks/jira')
@WebhookRateLimit() // Higher throughput for webhook endpoints
export class JiraWebhookController {
  private readonly logger = new Logger(JiraWebhookController.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOK_PROCESSING)
    private readonly webhookQueue: Queue<WebhookProcessingJob>,
    private readonly webhookSecrets: WebhookSecretsService,
  ) {}

  /**
   * Handle JIRA webhooks with organization token
   *
   * URL: /webhooks/jira/:token
   * The token identifies which organization this webhook belongs to.
   * This allows each organization to have their own webhook URL.
   *
   * Supported events:
   * - jira:issue_created
   * - jira:issue_updated
   * - jira:issue_deleted
   * - comment_created
   * - comment_updated
   * - comment_deleted
   */
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('token') token: string,
    @Req() req: RawBodyRequest<any>,
    @Headers() headers: Record<string, string>,
    @Body() payload: JiraWebhookPayload,
  ) {
    // Find organization and get its webhook secret
    const orgData = await this.webhookSecrets.getOrganizationWithSecret(
      token,
      'jira',
    );

    if (!orgData) {
      this.logger.warn(
        `Invalid webhook token/slug: ${token.substring(0, 8)}...`,
      );
      throw new NotFoundException('Invalid webhook token');
    }

    const { organizationId, secret: webhookSecret } = orgData;
    const webhookEvent = payload.webhookEvent;
    const issueKey = payload.issue?.key;

    this.logger.log(
      `Received JIRA webhook for org ${organizationId}: ${webhookEvent} for ${issueKey || 'N/A'}`,
    );

    // Verify webhook signature (mandatory if secret is configured)
    if (webhookSecret && req.rawBody) {
      const signature =
        headers['x-hub-signature'] || headers['x-atlassian-webhook-signature'];

      if (!signature) {
        this.logger.warn(
          `Missing JIRA webhook signature for org ${organizationId}`,
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
          `Invalid JIRA webhook signature for org ${organizationId}`,
        );
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Queue the webhook for processing with organization context
    await this.webhookQueue.add(
      'process',
      {
        type: 'jira',
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

    this.logger.log(`JIRA webhook queued: ${webhookEvent}`);

    return { status: 'ok', message: 'Webhook received' };
  }

  /**
   * Verify webhook signature using HMAC with timing-safe comparison
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

      // timingSafeEqual requires equal length buffers
      // If lengths differ, signatures definitely don't match
      // but we still do a constant-time comparison to prevent timing attacks
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
      'x-atlassian-webhook-identifier',
      'x-atlassian-webhook-signature',
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
