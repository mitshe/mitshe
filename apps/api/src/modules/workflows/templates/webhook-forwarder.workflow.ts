import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Webhook Forwarder Workflow
 *
 * Trigger: Incoming HTTP webhook
 * Flow: Transform data and forward to another endpoint
 *
 * Perfect for:
 * - Integrating systems without native support
 * - Data transformation between APIs
 * - Webhook proxy with modifications
 */
export const WEBHOOK_FORWARDER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    target_url: 'https://example.com/webhook',
    add_timestamp: true,
    add_source_header: true,
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:webhook',
      name: 'Incoming Webhook',
      position: { x: 100, y: 200 },
      config: {},
    },
    {
      id: 'transform',
      type: 'utility:script',
      name: 'Transform Data',
      position: { x: 350, y: 200 },
      config: {
        expression: `{
          "payload": {
            ...trigger.body,
            ...(vars.add_timestamp ? { "_forwardedAt": new Date().toISOString() } : {}),
            "_source": "mitshe-workflow"
          },
          "headers": {
            "Content-Type": "application/json",
            ...(vars.add_source_header ? { "X-Forwarded-By": "Mitshe" } : {})
          }
        }`,
      },
    },
    {
      id: 'forward',
      type: 'utility:http_request',
      name: 'Forward to Target',
      position: { x: 600, y: 200 },
      config: {
        method: 'POST',
        url: '{{vars.target_url}}',
        headers: '{{ctx.headers}}',
        body: '{{ctx.payload}}',
      },
    },
    {
      id: 'log_result',
      type: 'utility:script',
      name: 'Log Result',
      position: { x: 850, y: 200 },
      config: {
        expression: `{
          "forwarded": true,
          "targetUrl": vars.target_url,
          "responseStatus": nodes.forward.statusCode,
          "timestamp": new Date().toISOString()
        }`,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'transform' },
    { id: 'e2', source: 'transform', target: 'forward' },
    { id: 'e3', source: 'forward', target: 'log_result' },
  ],
};

export const WEBHOOK_FORWARDER_METADATA = {
  name: 'Webhook Forwarder',
  description:
    'Receive webhooks, transform the data, and forward to another endpoint. Perfect for integrating systems or proxying webhooks with modifications.',
  category: 'integration',
  tags: ['webhook', 'http', 'integration', 'proxy', 'transform'],
  requiredIntegrations: [],
  variables: {
    target_url: {
      type: 'string',
      description: 'URL to forward the webhook to',
      default: 'https://example.com/webhook',
    },
    add_timestamp: {
      type: 'boolean',
      description: 'Add forwarded timestamp to payload',
      default: true,
    },
    add_source_header: {
      type: 'boolean',
      description: 'Add X-Forwarded-By header',
      default: true,
    },
  },
};
