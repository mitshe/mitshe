import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * GitHub PR AI Review Workflow
 *
 * Trigger: GitHub Pull Request opened/updated
 * Flow: AI reviews code changes and posts review comment
 *
 * Perfect for:
 * - Automated code review
 * - Catching common issues
 * - Enforcing code standards
 */
export const GITHUB_PR_AI_REVIEW_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    review_focus: 'security,performance,best-practices',
    auto_approve_threshold: 90, // Confidence threshold for auto-approval suggestions
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:webhook',
      name: 'GitHub PR Webhook',
      position: { x: 100, y: 200 },
      config: {
        // Configure GitHub webhook to send pull_request events
        description: 'Receives GitHub pull_request webhook events',
      },
    },
    {
      id: 'prepare_review',
      type: 'utility:script',
      name: 'Prepare Review Context',
      position: { x: 300, y: 200 },
      config: {
        expression: `{
          "prNumber": trigger.pull_request.number,
          "prTitle": trigger.pull_request.title,
          "prBody": trigger.pull_request.body || "",
          "author": trigger.pull_request.user.login,
          "changedFiles": trigger.pull_request.changed_files,
          "additions": trigger.pull_request.additions,
          "deletions": trigger.pull_request.deletions,
          "baseBranch": trigger.pull_request.base.ref,
          "headBranch": trigger.pull_request.head.ref,
          "repoFullName": trigger.repository.full_name
        }`,
      },
    },
    {
      id: 'ai_review',
      type: 'action:ai_prompt',
      name: 'AI Code Review',
      position: { x: 550, y: 200 },
      config: {
        systemPrompt: `You are an expert code reviewer. Your job is to review pull requests and provide constructive feedback.
Focus on: {{vars.review_focus}}

Be specific about issues found, suggest fixes, and highlight good practices.
Format your response as a professional code review comment.`,
        prompt: `Review this Pull Request:

**PR #{{ctx.prNumber}}**: {{ctx.prTitle}}
**Author**: {{ctx.author}}
**Branch**: {{ctx.headBranch}} → {{ctx.baseBranch}}
**Changes**: +{{ctx.additions}} / -{{ctx.deletions}} in {{ctx.changedFiles}} files

**Description**:
{{ctx.prBody}}

Provide a code review covering:
1. **Summary**: Brief overview of the changes
2. **Security**: Any security concerns?
3. **Performance**: Performance implications?
4. **Best Practices**: Code quality and standards
5. **Suggestions**: Specific improvements
6. **Overall Assessment**: Approve, Request Changes, or Comment

End with a confidence score (0-100) for automatic approval.`,
        maxTokens: 2000,
      },
    },
    {
      id: 'post_review',
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
          body: `## AI Code Review

{{nodes.ai_review.content}}

---
*Automated review by Mitshe AI*`,
        }),
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'prepare_review' },
    { id: 'e2', source: 'prepare_review', target: 'ai_review' },
    { id: 'e3', source: 'ai_review', target: 'post_review' },
  ],
};

export const GITHUB_PR_AI_REVIEW_METADATA = {
  name: 'GitHub PR AI Review',
  description:
    'Automatically review Pull Requests with AI. Posts a detailed code review comment covering security, performance, and best practices.',
  category: 'automation',
  tags: ['github', 'ai', 'code-review', 'pull-request', 'automation'],
  requiredIntegrations: ['github', 'ai'],
  variables: {
    review_focus: {
      type: 'string',
      description: 'Comma-separated areas to focus on',
      default: 'security,performance,best-practices',
    },
    auto_approve_threshold: {
      type: 'number',
      description: 'Confidence threshold (0-100) for suggesting auto-approval',
      default: 90,
    },
  },
};
