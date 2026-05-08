import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Feature Development Workflow
 *
 * Trigger: Manual or webhook (Jira issue created)
 * Flow: Create session → Claude Code implements → Session stays open for user
 *
 * User gets a running session with work already started by AI.
 */
export const FEATURE_DEVELOPMENT_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    repository_id: '',
    snapshot_id: '',
    branch: '',
    task_description: '',
    notify_channel: '#dev',
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Start Development',
      position: { x: 100, y: 200 },
      config: {
        description: 'Trigger with task context (taskKey, task_description)',
      },
    },
    {
      id: 'create_session',
      type: 'action:session_create',
      name: 'Create Session',
      position: { x: 350, y: 200 },
      config: {
        name: 'Dev: {{vars.task_description}}',
        repositoryIds: ['{{vars.repository_id}}'],
        snapshotId: '{{vars.snapshot_id}}',
        instructions:
          'Task: {{vars.task_description}}\n\nImplement this feature. Follow existing patterns. Write tests.',
        enableDocker: false,
      },
    },
    {
      id: 'ai_work',
      type: 'action:session_agent',
      name: 'Claude Code Implements',
      position: { x: 600, y: 200 },
      config: {
        prompt:
          'Implement the following task:\n\n{{vars.task_description}}\n\nCreate a feature branch, implement the changes, and write tests. Commit when done.',
        provider: 'claude',
        startArguments: '--dangerously-skip-permissions',
        timeout: 600000,
      },
    },
    {
      id: 'notify',
      type: 'action:slack_message',
      name: 'Notify',
      position: { x: 850, y: 200 },
      config: {
        channel: '{{vars.notify_channel}}',
        text: 'Session ready for "{{vars.task_description}}". Claude Code has started working. Open the session to continue.',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'create_session' },
    { id: 'e2', source: 'create_session', target: 'ai_work' },
    { id: 'e3', source: 'ai_work', target: 'notify' },
  ],
};

export const FEATURE_DEVELOPMENT_METADATA = {
  name: 'Feature Development',
  description:
    'Creates a session, Claude Code starts implementing your task, and the session stays open for you to continue or review.',
  category: 'AI Development',
  tags: ['ai', 'development', 'session', 'claude-code'],
  requiredIntegrations: [],
  variables: {
    repository_id: {
      type: 'string',
      description: 'Repository to work on',
      default: '',
    },
    snapshot_id: {
      type: 'string',
      description: 'Snapshot to start from (optional)',
      default: '',
    },
    branch: {
      type: 'string',
      description: 'Branch to create/checkout',
      default: '',
    },
    task_description: {
      type: 'string',
      description: 'What to implement',
      default: '',
    },
    notify_channel: {
      type: 'string',
      description: 'Slack channel for notifications',
      default: '#dev',
    },
  },
};
