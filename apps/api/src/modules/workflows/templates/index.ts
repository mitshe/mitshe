/**
 * Workflow Templates
 *
 * Pre-built workflow templates that can be used as starting points
 * for common automation scenarios.
 */

import {
  AI_JIRA_DEVELOPER_WORKFLOW,
  AI_JIRA_DEVELOPER_METADATA,
} from './ai-jira-developer.workflow';

import {
  AI_JIRA_DEVELOPER_MANUAL_WORKFLOW,
  AI_JIRA_DEVELOPER_MANUAL_METADATA,
} from './ai-jira-developer-manual.workflow';

import {
  SIMPLE_SLACK_NOTIFICATION_WORKFLOW,
  SIMPLE_SLACK_NOTIFICATION_METADATA,
} from './simple-slack-notification.workflow';

import {
  AI_TEXT_ANALYZER_WORKFLOW,
  AI_TEXT_ANALYZER_METADATA,
} from './ai-text-analyzer.workflow';

import {
  GITHUB_PR_AI_REVIEW_WORKFLOW,
  GITHUB_PR_AI_REVIEW_METADATA,
} from './github-pr-ai-review.workflow';

import {
  WEBHOOK_FORWARDER_WORKFLOW,
  WEBHOOK_FORWARDER_METADATA,
} from './webhook-forwarder.workflow';

import {
  DAILY_STANDUP_GENERATOR_WORKFLOW,
  DAILY_STANDUP_GENERATOR_METADATA,
} from './daily-standup-generator.workflow';

import {
  TASK_ESTIMATION_WORKFLOW,
  TASK_ESTIMATION_METADATA,
} from './task-estimation.workflow';

import {
  PROJECT_ANALYZER_WORKFLOW,
  PROJECT_ANALYZER_METADATA,
} from './project-analyzer.workflow';

import {
  CODE_IMPROVEMENT_SUGGESTIONS_WORKFLOW,
  CODE_IMPROVEMENT_SUGGESTIONS_METADATA,
} from './code-improvement-suggestions.workflow';

import {
  SPRINT_PLANNER_WORKFLOW,
  SPRINT_PLANNER_METADATA,
} from './sprint-planner.workflow';

export {
  AI_JIRA_DEVELOPER_WORKFLOW,
  AI_JIRA_DEVELOPER_METADATA,
  AI_JIRA_DEVELOPER_MANUAL_WORKFLOW,
  AI_JIRA_DEVELOPER_MANUAL_METADATA,
  SIMPLE_SLACK_NOTIFICATION_WORKFLOW,
  SIMPLE_SLACK_NOTIFICATION_METADATA,
  AI_TEXT_ANALYZER_WORKFLOW,
  AI_TEXT_ANALYZER_METADATA,
  GITHUB_PR_AI_REVIEW_WORKFLOW,
  GITHUB_PR_AI_REVIEW_METADATA,
  WEBHOOK_FORWARDER_WORKFLOW,
  WEBHOOK_FORWARDER_METADATA,
  DAILY_STANDUP_GENERATOR_WORKFLOW,
  DAILY_STANDUP_GENERATOR_METADATA,
  TASK_ESTIMATION_WORKFLOW,
  TASK_ESTIMATION_METADATA,
  PROJECT_ANALYZER_WORKFLOW,
  PROJECT_ANALYZER_METADATA,
  CODE_IMPROVEMENT_SUGGESTIONS_WORKFLOW,
  CODE_IMPROVEMENT_SUGGESTIONS_METADATA,
  SPRINT_PLANNER_WORKFLOW,
  SPRINT_PLANNER_METADATA,
};

// Template registry for easy lookup
export const WORKFLOW_TEMPLATES = {
  'ai-jira-developer': {
    workflow: AI_JIRA_DEVELOPER_WORKFLOW,
    metadata: AI_JIRA_DEVELOPER_METADATA,
  },
  'ai-jira-developer-manual': {
    workflow: AI_JIRA_DEVELOPER_MANUAL_WORKFLOW,
    metadata: AI_JIRA_DEVELOPER_MANUAL_METADATA,
  },
  'simple-slack-notification': {
    workflow: SIMPLE_SLACK_NOTIFICATION_WORKFLOW,
    metadata: SIMPLE_SLACK_NOTIFICATION_METADATA,
  },
  'ai-text-analyzer': {
    workflow: AI_TEXT_ANALYZER_WORKFLOW,
    metadata: AI_TEXT_ANALYZER_METADATA,
  },
  'github-pr-ai-review': {
    workflow: GITHUB_PR_AI_REVIEW_WORKFLOW,
    metadata: GITHUB_PR_AI_REVIEW_METADATA,
  },
  'webhook-forwarder': {
    workflow: WEBHOOK_FORWARDER_WORKFLOW,
    metadata: WEBHOOK_FORWARDER_METADATA,
  },
  'daily-standup-generator': {
    workflow: DAILY_STANDUP_GENERATOR_WORKFLOW,
    metadata: DAILY_STANDUP_GENERATOR_METADATA,
  },
  'task-estimation': {
    workflow: TASK_ESTIMATION_WORKFLOW,
    metadata: TASK_ESTIMATION_METADATA,
  },
  'project-analyzer': {
    workflow: PROJECT_ANALYZER_WORKFLOW,
    metadata: PROJECT_ANALYZER_METADATA,
  },
  'code-improvement-suggestions': {
    workflow: CODE_IMPROVEMENT_SUGGESTIONS_WORKFLOW,
    metadata: CODE_IMPROVEMENT_SUGGESTIONS_METADATA,
  },
  'sprint-planner': {
    workflow: SPRINT_PLANNER_WORKFLOW,
    metadata: SPRINT_PLANNER_METADATA,
  },
} as const;

export type WorkflowTemplateId = keyof typeof WORKFLOW_TEMPLATES;
