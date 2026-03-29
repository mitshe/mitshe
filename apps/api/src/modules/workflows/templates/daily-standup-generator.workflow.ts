import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Daily Standup Generator Workflow
 *
 * Trigger: Manual (can be scheduled externally)
 * Flow: AI generates standup update from provided context
 *
 * Perfect for:
 * - Generating standup updates
 * - Summarizing daily progress
 * - Team status reports
 */
export const DAILY_STANDUP_GENERATOR_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    slack_channel: '#daily-standup',
    team_name: 'Engineering',
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Generate Standup',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            yesterday: {
              type: 'string',
              description: 'What was accomplished yesterday',
            },
            today: {
              type: 'string',
              description: 'What is planned for today',
            },
            blockers: {
              type: 'string',
              description: 'Any blockers or concerns (optional)',
            },
          },
          required: ['yesterday', 'today'],
        },
      },
    },
    {
      id: 'ai_format',
      type: 'action:ai_prompt',
      name: 'AI Format Standup',
      position: { x: 350, y: 200 },
      config: {
        systemPrompt: `You are a helpful assistant that formats standup updates.
Create clear, professional, and concise standup messages.
Use bullet points for clarity. Add relevant emojis sparingly.`,
        prompt: `Format this into a professional standup update:

**Yesterday's accomplishments:**
{{trigger.yesterday}}

**Today's plan:**
{{trigger.today}}

**Blockers/Concerns:**
{{trigger.blockers || "None"}}

Create a well-formatted standup message suitable for posting in Slack.
Include:
- :white_check_mark: Yesterday section
- :dart: Today section
- :warning: Blockers section (only if there are blockers)
- Keep it concise but informative`,
        maxTokens: 500,
      },
    },
    {
      id: 'post_slack',
      type: 'action:slack_message',
      name: 'Post to Slack',
      position: { x: 600, y: 200 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: `*{{vars.team_name}} Daily Standup* - ${new Date().toLocaleDateString()}

{{nodes.ai_format.content}}`,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'ai_format' },
    { id: 'e2', source: 'ai_format', target: 'post_slack' },
  ],
};

export const DAILY_STANDUP_GENERATOR_METADATA = {
  name: 'Daily Standup Generator',
  description:
    'Generate and post formatted daily standup updates to Slack. AI helps format your updates into a clear, professional message.',
  category: 'productivity',
  tags: ['slack', 'ai', 'standup', 'daily', 'productivity', 'team'],
  requiredIntegrations: ['slack', 'ai'],
  variables: {
    slack_channel: {
      type: 'string',
      description: 'Slack channel for standup posts',
      default: '#daily-standup',
    },
    team_name: {
      type: 'string',
      description: 'Team name for the standup header',
      default: 'Engineering',
    },
  },
};
