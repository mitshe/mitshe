/**
 * Generic Webhook Notification Executor
 * Handles: action:webhook, action:notify_webhook
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';
import { logger } from '../../logger.js';

export class WebhookExecutor extends BaseExecutor {
  readonly supportedTypes = ['action:webhook', 'action:notify_webhook'];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const url = this.getString(config, 'url');
    const method = this.getString(config, 'method', 'POST').toUpperCase();
    const headers = (config.headers as Record<string, string>) || {};
    const body = config.body;

    logger.info(`Sending webhook to ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      let responseBody: unknown;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      if (!response.ok) {
        throw new Error(
          `Webhook returned error (${response.status}): ${JSON.stringify(responseBody)}`,
        );
      }

      logger.info(`Webhook sent successfully (${response.status})`);

      return {
        sent: true,
        statusCode: response.status,
        response: responseBody,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Webhook failed: ${errorMessage}`);
    }
  }
}
