import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Simple Slack Notification Workflow
 *
 * Trigger: Manual
 * Flow: Send a customizable message to a Slack channel
 *
 * Perfect for:
 * - Testing Slack integration
 * - Quick notifications
 * - Learning how workflows work
 */
export const SIMPLE_SLACK_NOTIFICATION_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    slack_channel: '#general',
    message: 'Hello from Mitshe! :wave:',
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Manual Trigger',
      position: { x: 100, y: 200 },
      config: {},
    },
    {
      id: 'send_slack',
      type: 'action:slack_message',
      name: 'Send Slack Message',
      position: { x: 350, y: 200 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: '{{vars.message}}',
      },
    },
  ],
  edges: [{ id: 'e1', source: 'trigger', target: 'send_slack' }],
};

export const SIMPLE_SLACK_NOTIFICATION_METADATA = {
  name: 'Simple Slack Notification',
  description:
    'Send a simple message to a Slack channel. Great for testing your Slack integration or sending quick notifications.',
  category: 'notifications',
  tags: ['slack', 'notification', 'simple', 'starter'],
  requiredIntegrations: ['slack'],
  variables: {
    slack_channel: {
      type: 'string',
      description: 'Slack channel to send message to',
      default: '#general',
    },
    message: {
      type: 'string',
      description: 'Message content to send',
      default: 'Hello from Mitshe! :wave:',
    },
  },
};
