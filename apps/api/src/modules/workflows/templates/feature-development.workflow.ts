import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Feature Development Workflow
 *
 * Trigger: Manual (with task context)
 * Flow: Create branch → AI implements feature → Run tests → Create PR → Notify
 */
export const FEATURE_DEVELOPMENT_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    repository_id: '',
    base_branch: 'main',
    branch_prefix: 'feat',
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
        description: 'Manually trigger feature development with task context',
      },
    },
    {
      id: 'get_repo',
      type: 'data:get_repository',
      name: 'Get Repository',
      position: { x: 300, y: 200 },
      config: {
        repositoryId: '{{vars.repository_id}}',
      },
    },
    {
      id: 'create_branch',
      type: 'action:git_create_branch',
      name: 'Create Feature Branch',
      position: { x: 500, y: 200 },
      config: {
        repositoryId: '{{vars.repository_id}}',
        branchName: '{{vars.branch_prefix}}/{{trigger.taskKey || "feature"}}-{{trigger.timestamp}}',
        sourceBranch: '{{vars.base_branch}}',
      },
    },
    {
      id: 'ai_implement',
      type: 'action:ai_code_task',
      name: 'AI Implements Feature',
      position: { x: 700, y: 200 },
      config: {
        systemPrompt: `You are a senior software engineer. Implement the requested feature following best practices.
Write clean, well-tested code. Follow existing patterns in the codebase.`,
        prompt: `Implement the following feature:

{{vars.task_description}}

Repository: {{nodes.get_repo.name}}
Branch: {{nodes.create_branch.branchName}}

Requirements:
1. Write the implementation
2. Add appropriate tests
3. Follow existing code style and patterns
4. Keep changes minimal and focused`,
        maxTokens: 4000,
      },
    },
    {
      id: 'commit_changes',
      type: 'action:git_commit',
      name: 'Commit Changes',
      position: { x: 900, y: 200 },
      config: {
        repositoryId: '{{vars.repository_id}}',
        message: 'feat: {{vars.task_description}}',
        branch: '{{nodes.create_branch.branchName}}',
      },
    },
    {
      id: 'create_pr',
      type: 'action:git_create_mr',
      name: 'Create Pull Request',
      position: { x: 1100, y: 200 },
      config: {
        repositoryId: '{{vars.repository_id}}',
        title: '{{vars.task_description}}',
        description:
          'Automated implementation by mitshe AI.\n\n{{nodes.ai_implement.content}}',
        sourceBranch: '{{nodes.create_branch.branchName}}',
        targetBranch: '{{vars.base_branch}}',
      },
    },
    {
      id: 'notify',
      type: 'action:slack_message',
      name: 'Notify Team',
      position: { x: 1300, y: 200 },
      config: {
        channel: '{{vars.notify_channel}}',
        text: 'New PR created: {{nodes.create_pr.title}}\n{{nodes.create_pr.webUrl}}',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'get_repo' },
    { id: 'e2', source: 'get_repo', target: 'create_branch' },
    { id: 'e3', source: 'create_branch', target: 'ai_implement' },
    { id: 'e4', source: 'ai_implement', target: 'commit_changes' },
    { id: 'e5', source: 'commit_changes', target: 'create_pr' },
    { id: 'e6', source: 'create_pr', target: 'notify' },
  ],
};

export const FEATURE_DEVELOPMENT_METADATA = {
  name: 'Feature Development',
  description:
    'End-to-end feature development: create branch, AI implements the feature, commit, create PR, notify team.',
  category: 'AI Development',
  tags: ['ai', 'development', 'git', 'pull-request', 'automation'],
  requiredIntegrations: ['github', 'ai'],
  variables: {
    repository_id: {
      type: 'string',
      description: 'Repository to work on',
      default: '',
    },
    base_branch: {
      type: 'string',
      description: 'Base branch to create feature branch from',
      default: 'main',
    },
    branch_prefix: {
      type: 'string',
      description: 'Branch name prefix',
      default: 'feat',
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
