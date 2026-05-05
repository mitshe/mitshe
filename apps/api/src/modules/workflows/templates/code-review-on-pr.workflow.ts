import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Code Review on PR Workflow
 *
 * Trigger: Webhook (GitHub/GitLab PR event)
 * Flow: Extract PR info → AI reviews code → Post review comment → Label PR
 */
export const CODE_REVIEW_ON_PR_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    review_checklist:
      'security,performance,error-handling,code-style,test-coverage',
    severity_labels: 'true',
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:webhook',
      name: 'PR Webhook',
      position: { x: 100, y: 200 },
      config: {
        description:
          'Receives pull_request or merge_request webhook events from GitHub/GitLab',
      },
    },
    {
      id: 'extract_context',
      type: 'utility:script',
      name: 'Extract PR Context',
      position: { x: 300, y: 200 },
      config: {
        expression: `{
          "prNumber": trigger.pull_request?.number || trigger.object_attributes?.iid,
          "prTitle": trigger.pull_request?.title || trigger.object_attributes?.title,
          "prBody": trigger.pull_request?.body || trigger.object_attributes?.description || "",
          "author": trigger.pull_request?.user?.login || trigger.user?.username,
          "sourceBranch": trigger.pull_request?.head?.ref || trigger.object_attributes?.source_branch,
          "targetBranch": trigger.pull_request?.base?.ref || trigger.object_attributes?.target_branch,
          "repoFullName": trigger.repository?.full_name || trigger.project?.path_with_namespace,
          "additions": trigger.pull_request?.additions || 0,
          "deletions": trigger.pull_request?.deletions || 0,
          "changedFiles": trigger.pull_request?.changed_files || 0
        }`,
      },
    },
    {
      id: 'ai_review',
      type: 'action:ai_code_review',
      name: 'AI Code Review',
      position: { x: 550, y: 200 },
      config: {
        systemPrompt: `You are an expert code reviewer performing a thorough review.

Review checklist: {{vars.review_checklist}}

Structure your review as:
## Summary
Brief overview of the changes.

## Issues Found
List issues by severity (Critical / Warning / Info).

## Suggestions
Actionable improvement suggestions.

## Verdict
APPROVE, REQUEST_CHANGES, or COMMENT with reasoning.`,
        prompt: `Review PR #{{ctx.prNumber}}: "{{ctx.prTitle}}"
Author: {{ctx.author}}
Branch: {{ctx.sourceBranch}} → {{ctx.targetBranch}}
Changes: +{{ctx.additions}} / -{{ctx.deletions}} across {{ctx.changedFiles}} files

Description:
{{ctx.prBody}}`,
        maxTokens: 3000,
      },
    },
    {
      id: 'post_comment',
      type: 'utility:http_request',
      name: 'Post Review Comment',
      position: { x: 800, y: 200 },
      config: {
        method: 'POST',
        url: 'https://api.github.com/repos/{{ctx.repoFullName}}/issues/{{ctx.prNumber}}/comments',
        headers: {
          Authorization: 'Bearer {{credentials.github.token}}',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: `## AI Code Review\n\n{{nodes.ai_review.content}}\n\n---\n*Automated review by mitshe*`,
        }),
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'extract_context' },
    { id: 'e2', source: 'extract_context', target: 'ai_review' },
    { id: 'e3', source: 'ai_review', target: 'post_comment' },
  ],
};

export const CODE_REVIEW_ON_PR_METADATA = {
  name: 'Code Review on PR',
  description:
    'Automatically review every Pull Request with AI. Posts detailed review covering security, performance, and code quality.',
  category: 'Code Review',
  tags: ['ai', 'code-review', 'github', 'gitlab', 'pull-request'],
  requiredIntegrations: ['github', 'ai'],
  variables: {
    review_checklist: {
      type: 'string',
      description: 'Comma-separated areas to review',
      default: 'security,performance,error-handling,code-style,test-coverage',
    },
    severity_labels: {
      type: 'string',
      description: 'Add severity labels to PR (true/false)',
      default: 'true',
    },
  },
};
