import {
  Controller,
  Post,
  Head,
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

interface TrelloWebhookPayload {
  action: {
    id: string;
    idMemberCreator: string;
    type: string; // createCard, updateCard, deleteCard, commentCard, etc.
    date: string;
    data: {
      card?: {
        id: string;
        name: string;
        shortLink?: string;
        idShort?: number;
      };
      board?: {
        id: string;
        name: string;
        shortLink?: string;
      };
      list?: {
        id: string;
        name: string;
      };
      listBefore?: {
        id: string;
        name: string;
      };
      listAfter?: {
        id: string;
        name: string;
      };
      text?: string;
      old?: Record<string, unknown>;
    };
    memberCreator?: {
      id: string;
      username: string;
      fullName: string;
    };
  };
  model: {
    id: string;
    name: string;
  };
}

@Controller('webhooks/trello')
@WebhookRateLimit()
export class TrelloWebhookController {
  private readonly logger = new Logger(TrelloWebhookController.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOK_PROCESSING)
    private readonly webhookQueue: Queue<WebhookProcessingJob>,
    private readonly webhookSecrets: WebhookSecretsService,
  ) {}

  /**
   * Trello sends a HEAD request to verify the webhook URL exists.
   * Must respond with 200 OK.
   */
  @Head(':token')
  @HttpCode(HttpStatus.OK)
  async verifyWebhook() {
    return;
  }

  /**
   * Handle Trello webhooks with organization token
   *
   * URL: /webhooks/trello/:token
   *
   * Supported action types:
   * - createCard
   * - updateCard (including list changes)
   * - deleteCard
   * - commentCard
   * - addLabelToCard / removeLabelFromCard
   * - addMemberToCard / removeMemberFromCard
   */
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('token') token: string,
    @Req() req: RawBodyRequest<any>,
    @Headers() headers: Record<string, string>,
    @Body() payload: TrelloWebhookPayload,
  ) {
    const orgData = await this.webhookSecrets.getOrganizationWithSecret(
      token,
      'trello',
    );

    if (!orgData) {
      this.logger.warn(
        `Invalid webhook token/slug: ${token.substring(0, 8)}...`,
      );
      throw new NotFoundException('Invalid webhook token');
    }

    const { organizationId, secret: webhookSecret } = orgData;
    const actionType = payload.action?.type;
    const cardName = payload.action?.data?.card?.name;

    this.logger.log(
      `Received Trello webhook for org ${organizationId}: ${actionType} for card "${cardName || 'N/A'}"`,
    );

    // Verify webhook signature (mandatory if secret is configured)
    if (webhookSecret && req.rawBody) {
      const signature = headers['x-trello-webhook'];

      if (!signature) {
        this.logger.warn(
          `Missing Trello webhook signature for org ${organizationId}`,
        );
        throw new UnauthorizedException('Missing webhook signature');
      }

      // Trello uses HMAC-SHA1 with base64 encoding
      // The content to sign is: body + callbackURL
      const callbackUrl = `${process.env.API_BASE_URL || 'https://api.yourdomain.com'}/webhooks/trello/${token}`;
      const isValid = this.verifySignature(
        req.rawBody,
        callbackUrl,
        signature,
        webhookSecret,
      );

      if (!isValid) {
        this.logger.warn(
          `Invalid Trello webhook signature for org ${organizationId}`,
        );
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Queue the webhook for processing
    await this.webhookQueue.add(
      'process',
      {
        type: 'trello',
        payload: {
          ...(payload as unknown as Record<string, unknown>),
          _organizationId: organizationId,
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

    this.logger.log(`Trello webhook queued: ${actionType}`);

    return { status: 'ok', message: 'Webhook received' };
  }

  /**
   * Verify Trello webhook signature using HMAC-SHA1
   * Trello signs: body + callbackURL
   */
  private verifySignature(
    payload: Buffer,
    callbackUrl: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const content = Buffer.concat([payload, Buffer.from(callbackUrl)]);

      const hmac = crypto.createHmac('sha1', secret);
      hmac.update(content);
      const expectedSignature = hmac.digest('base64');

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const allowedHeaders = ['content-type', 'x-trello-webhook', 'user-agent'];

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
