/**
 * HTTP Node Executors
 * Handles HTTP requests
 */

import type { ExecutorContext } from './index.js';
import { logger } from '../logger.js';

export async function executeHttpNode(
  type: string,
  config: Record<string, unknown>,
  _ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'utility:http_request':
      return executeHttpRequest(config);

    default:
      throw new Error(`Unknown HTTP action: ${type}`);
  }
}

/**
 * Execute HTTP request
 */
async function executeHttpRequest(
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = config.url as string;
  const method = ((config.method as string) || 'GET').toUpperCase();
  const headers = (config.headers as Record<string, string>) || {};
  const body = config.body;
  const timeout = (config.timeout as number) || 30000;

  if (!url) {
    throw new Error('URL is required');
  }

  logger.info(`HTTP ${method} ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out',
        status: 0,
      };
    }

    return {
      success: false,
      error: (error as Error).message,
      status: 0,
    };
  }
}
