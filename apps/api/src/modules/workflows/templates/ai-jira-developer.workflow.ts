import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * AI Jira Developer Workflow
 *
 * Trigger: When "AI" component is added to a Jira issue
 * Flow:
 * 1. Fetch issue details from Jira
 * 2. Create branch (ai-{issueKey})
 * 3. Run AI analysis to determine if task can be automated
 * 4. If simple task → AI executes, creates commit, MR, updates Jira, notifies Slack
 * 5. If complex task → AI prepares description, comments on Jira, notifies Slack
 *
 * Branch naming: ai-{issueKey} (e.g., ai-ee-12345)
 * Commit format: [{issueKey}] {description}
 */
export const AI_JIRA_DEVELOPER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    slack_channel: '#ai-dev-notifications',
    target_branch: 'develop',
    // Repository matching - flexible options:
    repository_match_field: 'jira_component', // 'jira_component' | 'jira_label' | 'static'
    repository_name: '', // only used when repository_match_field is 'static'
  },
  nodes: [
    // ============================================
    // TRIGGER: Jira webhook when AI component added
    // ============================================
    {
      id: 'trigger',
      type: 'trigger:jira_component_added',
      name: 'AI Component Added',
      position: { x: 100, y: 300 },
      config: {
        component: 'AI',
      },
    },

    // ============================================
    // PREPARE: Generate branch name and extract repo info
    // ============================================
    {
      id: 'prepare_data',
      type: 'utility:script',
      name: 'Prepare Data',
      position: { x: 200, y: 300 },
      config: {
        // Extract repository name based on configured match field
        // Note: trigger.components may be array of strings or {id, name} objects
        // All outputs are automatically available via ctx.* in subsequent nodes
        expression: `{
          "branchName": "ai-" + trigger.issueKey.toLowerCase(),
          "issueKey": trigger.issueKey,
          "issueSummary": trigger.summary,
          "issueUrl": trigger.issueUrl || "https://jira.example.com/browse/" + trigger.issueKey,
          "repoSearchName": vars.repository_match_field === "jira_component"
            ? (trigger.components && trigger.components[0]
              ? (typeof trigger.components[0] === "string" ? trigger.components[0] : trigger.components[0].name)
              : "")
            : (vars.repository_match_field === "jira_label"
              ? (trigger.labels && trigger.labels[0] ? trigger.labels[0] : "")
              : vars.repository_name)
        }`,
      },
    },

    // ============================================
    // FETCH: Get full issue details from Jira
    // ============================================
    {
      id: 'fetch_issue',
      type: 'data:get_jira_issue',
      name: 'Fetch Issue Details',
      position: { x: 350, y: 300 },
      config: {
        issueKey: '{{trigger.issueKey}}',
      },
    },

    // ============================================
    // FIND REPOSITORY: Search by name from JIRA data
    // ============================================
    {
      id: 'find_repo',
      type: 'data:find_repository',
      name: 'Find Repository',
      position: { x: 500, y: 300 },
      config: {
        nameContains: '{{ctx.repoSearchName}}',
      },
    },

    // ============================================
    // CREATE BRANCH: ai-{issueKey} (lowercase)
    // ============================================
    {
      id: 'create_branch',
      type: 'action:git_create_branch',
      name: 'Create AI Branch',
      position: { x: 700, y: 300 },
      config: {
        branchName: '{{ctx.branchName}}',
        sourceBranch: '{{vars.target_branch}}',
      },
    },

    // ============================================
    // AI ANALYSIS: Determine task complexity
    // ============================================
    {
      id: 'ai_analyze',
      type: 'action:ai_analyze',
      name: 'Analyze Task Complexity',
      position: { x: 900, y: 300 },
      config: {
        content: `
Analyze the following Jira task and determine if it can be automated by AI:

**Issue Key:** {{ctx.issueKey}}
**Title:** {{nodes.fetch_issue.summary}}
**Description:**
{{nodes.fetch_issue.description}}

**Labels:** {{nodes.fetch_issue.labels}}
**Priority:** {{nodes.fetch_issue.priority}}
**Status:** {{nodes.fetch_issue.status}}

Evaluate:
1. Is this task clearly defined with specific requirements?
2. Is the scope limited and well-contained?
3. Can it be completed without needing clarification from stakeholders?
4. Is it a code change that can be tested automatically?

Respond with a JSON object.
`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            canAutomate: {
              type: 'boolean',
              description:
                'True if AI can fully complete this task without human intervention',
            },
            complexity: {
              type: 'string',
              enum: ['simple', 'medium', 'complex'],
              description: 'Task complexity level',
            },
            confidence: {
              type: 'number',
              description:
                'Confidence level 0-100 that AI can complete this task',
            },
            reasoning: {
              type: 'string',
              description: 'Brief explanation of the decision',
            },
            estimatedFiles: {
              type: 'number',
              description: 'Estimated number of files to modify',
            },
            suggestedApproach: {
              type: 'string',
              description: 'High-level approach if automating',
            },
            blockers: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of potential blockers or unclear requirements',
            },
          },
          required: ['canAutomate', 'complexity', 'confidence', 'reasoning'],
        }),
        maxTokens: 2000,
      },
    },

    // ============================================
    // CONDITION: Can AI automate this task?
    // ============================================
    {
      id: 'can_automate',
      type: 'control:condition',
      name: 'Can Automate?',
      position: { x: 1100, y: 300 },
      config: {
        condition:
          'nodes.ai_analyze.analysis.canAutomate == true && nodes.ai_analyze.analysis.confidence >= 70',
      },
    },

    // ============================================
    // PATH A: AI EXECUTES THE TASK
    // ============================================
    {
      id: 'ai_execute',
      type: 'action:ai_code_task',
      name: 'AI Execute Task',
      position: { x: 1300, y: 150 },
      config: {
        task: `
You are an expert software developer. Your task is to implement the following Jira issue.

## TASK DETAILS
**Issue Key:** {{ctx.issueKey}}
**Title:** {{nodes.fetch_issue.summary}}
**Description:**
{{nodes.fetch_issue.description}}

## AI ANALYSIS
{{nodes.ai_analyze.analysis.suggestedApproach}}

## REPOSITORY CONTEXT
- Repository: {{ctx.repositoryFullPath}}
- Branch: {{ctx.branch}}
- Working in the codebase for this project

## INSTRUCTIONS
1. Analyze the task requirements carefully
2. Identify which files need to be created or modified
3. Implement the changes following project coding standards
4. Add appropriate comments where necessary
5. Ensure the code is clean and well-structured

## OUTPUT FORMAT
For each file you create or modify, use this format:

--- FILE: path/to/file.ext ---
<file content here>
--- END FILE ---

Include ALL files that need to be created or modified for this task.
`,
        model: 'claude-sonnet-4-20250514',
        maxTokens: 8000,
      },
    },

    // ============================================
    // COMMIT: Create commit with changes
    // ============================================
    {
      id: 'create_commit',
      type: 'action:git_commit',
      name: 'Commit Changes',
      position: { x: 1500, y: 150 },
      config: {
        message: '[{{ctx.issueKey}}] {{nodes.fetch_issue.summary}}',
        // Files are automatically taken from ctx.files (populated by ai_execute)
      },
    },

    // ============================================
    // CREATE MR: Create merge request
    // ============================================
    {
      id: 'create_mr',
      type: 'action:git_create_mr',
      name: 'Create Merge Request',
      position: { x: 1700, y: 150 },
      config: {
        title: '[{{ctx.issueKey}}] {{nodes.fetch_issue.summary}}',
        description: `
## Summary
This MR was automatically generated by AI to address Jira issue [{{ctx.issueKey}}]({{ctx.issueUrl}}).

## Task Description
{{nodes.fetch_issue.description}}

## Changes Made
{{nodes.ai_execute.content}}

## Testing Instructions
Please review the changes and test according to the acceptance criteria in the Jira issue.

---
🤖 *Generated by AI Developer Workflow*
`,
        targetBranch: '{{vars.target_branch}}',
        sourceBranch: '{{ctx.branch}}',
      },
    },

    // ============================================
    // TRANSITION JIRA: Move to Code Review
    // ============================================
    {
      id: 'jira_transition',
      type: 'action:jira_transition',
      name: 'Move to Code Review',
      position: { x: 1900, y: 150 },
      config: {
        issueKey: '{{ctx.issueKey}}',
        transition: 'Code Review', // or transition ID
      },
    },

    // ============================================
    // JIRA COMMENT: Add completion comment
    // ============================================
    {
      id: 'jira_comment_done',
      type: 'action:jira_add_comment',
      name: 'Add Completion Comment',
      position: { x: 2100, y: 150 },
      config: {
        issueKey: '{{ctx.issueKey}}',
        comment: `
🤖 *AI Developer has completed this task*

## What was done
I've analyzed the requirements and implemented the requested changes.

**Merge Request:** {{ctx.mrUrl}}
**Branch:** \`{{ctx.branch}}\`

## Files Modified
{{#each ctx.files}}
- \`{{this.path}}\`
{{/each}}

## Testing Instructions
1. Pull the branch \`{{ctx.branch}}\`
2. Run the application locally
3. Verify the following:
   - [ ] The feature works as described in the issue
   - [ ] No regressions in related functionality
   - [ ] Code follows project standards

## AI Analysis
- **Complexity:** {{nodes.ai_analyze.analysis.complexity}}
- **Confidence:** {{nodes.ai_analyze.analysis.confidence}}%
- **Reasoning:** {{nodes.ai_analyze.analysis.reasoning}}

---
Please review the MR and provide feedback. If changes are needed, comment on the MR or update this issue.
`,
      },
    },

    // ============================================
    // SLACK: Notify about completion
    // ============================================
    {
      id: 'slack_notify_done',
      type: 'action:slack_message',
      name: 'Notify Completion',
      position: { x: 2300, y: 150 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: `
✅ *AI Developer completed task*

*Issue:* <{{ctx.issueUrl}}|{{ctx.issueKey}}> - {{nodes.fetch_issue.summary}}
*MR:* <{{ctx.mrUrl}}|View Merge Request>
*Branch:* \`{{ctx.branch}}\`
*Confidence:* {{nodes.ai_analyze.analysis.confidence}}%

Ready for code review! 🚀
`,
      },
    },

    // ============================================
    // PATH B: AI PREPARES DESCRIPTION FOR DEVELOPER
    // ============================================
    {
      id: 'ai_prepare_description',
      type: 'action:ai_prompt',
      name: 'Prepare Task Description',
      position: { x: 1300, y: 450 },
      config: {
        systemPrompt: `You are a senior software architect helping developers understand complex tasks.
Your role is to analyze Jira issues and provide clear, actionable guidance for developers.
Be specific about technical challenges, suggest approaches, and highlight potential pitfalls.`,
        prompt: `
Analyze this Jira task and prepare a detailed technical description for a developer.

## TASK DETAILS
**Issue Key:** {{ctx.issueKey}}
**Title:** {{nodes.fetch_issue.summary}}
**Description:**
{{nodes.fetch_issue.description}}

**Labels:** {{nodes.fetch_issue.labels}}
**Priority:** {{nodes.fetch_issue.priority}}
**Status:** {{nodes.fetch_issue.status}}

## WHY AI CANNOT AUTOMATE
{{nodes.ai_analyze.analysis.reasoning}}

**Complexity:** {{nodes.ai_analyze.analysis.complexity}}
**Blockers identified:**
{{#each nodes.ai_analyze.analysis.blockers}}
- {{this}}
{{/each}}

## YOUR TASK
Provide a comprehensive technical breakdown including:

1. **Summary** - Brief overview of what needs to be done
2. **Technical Analysis** - Detailed analysis of the implementation requirements
3. **Suggested Approach** - Step-by-step implementation plan
4. **Files to Modify** - List of files likely to be affected
5. **Potential Challenges** - Technical challenges and how to address them
6. **Questions for Stakeholders** - Any clarifications needed before starting
7. **Estimated Effort** - Time estimate (hours/days) with reasoning
8. **Acceptance Criteria** - Clear definition of done

Format your response in clean Markdown that can be posted as a Jira comment.
`,
        maxTokens: 3000,
      },
    },

    // ============================================
    // JIRA COMMENT: Add technical description
    // ============================================
    {
      id: 'jira_comment_manual',
      type: 'action:jira_add_comment',
      name: 'Add Technical Description',
      position: { x: 1500, y: 450 },
      config: {
        issueKey: '{{ctx.issueKey}}',
        comment: `
🤖 *AI Developer Analysis*

This task requires human developer intervention. Here's my technical analysis:

---

{{nodes.ai_prepare_description.content}}

---

**Why automation was not possible:**
- Complexity: {{nodes.ai_analyze.analysis.complexity}}
- Confidence: {{nodes.ai_analyze.analysis.confidence}}%
- Reason: {{nodes.ai_analyze.analysis.reasoning}}

**Branch prepared:** \`{{ctx.branch}}\`

A developer should pick up this task and use the prepared branch.
`,
      },
    },

    // ============================================
    // JIRA TRANSITION: Move to Ready for Dev
    // ============================================
    {
      id: 'jira_transition_manual',
      type: 'action:jira_transition',
      name: 'Move to Ready for Dev',
      position: { x: 1700, y: 450 },
      config: {
        issueKey: '{{ctx.issueKey}}',
        transition: 'Ready for Development',
      },
    },

    // ============================================
    // SLACK: Notify about manual task
    // ============================================
    {
      id: 'slack_notify_manual',
      type: 'action:slack_message',
      name: 'Notify Manual Task',
      position: { x: 1900, y: 450 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: `
⚠️ *AI Developer needs human help*

*Issue:* <{{ctx.issueUrl}}|{{ctx.issueKey}}> - {{nodes.fetch_issue.summary}}
*Complexity:* {{nodes.ai_analyze.analysis.complexity}}
*Confidence:* {{nodes.ai_analyze.analysis.confidence}}%

*Why automation failed:*
> {{nodes.ai_analyze.analysis.reasoning}}

*Branch prepared:* \`{{ctx.branch}}\`

A technical analysis has been added to the Jira issue. Developer assistance needed! 👨‍💻
`,
      },
    },
  ],

  edges: [
    // Main flow: trigger → prepare → fetch → find_repo → create_branch → analyze
    { id: 'e0', source: 'trigger', target: 'prepare_data' },
    { id: 'e1', source: 'prepare_data', target: 'fetch_issue' },
    { id: 'e2', source: 'fetch_issue', target: 'find_repo' },
    { id: 'e3', source: 'find_repo', target: 'create_branch' },
    { id: 'e4', source: 'create_branch', target: 'ai_analyze' },
    { id: 'e5', source: 'ai_analyze', target: 'can_automate' },

    // Path A: Can automate → execute → commit → MR → transition → comment → slack
    {
      id: 'e6',
      source: 'can_automate',
      target: 'ai_execute',
      label: 'true',
      condition: 'nodes.can_automate.result == true',
    },
    { id: 'e7', source: 'ai_execute', target: 'create_commit' },
    { id: 'e8', source: 'create_commit', target: 'create_mr' },
    { id: 'e9', source: 'create_mr', target: 'jira_transition' },
    { id: 'e10', source: 'jira_transition', target: 'jira_comment_done' },
    { id: 'e11', source: 'jira_comment_done', target: 'slack_notify_done' },

    // Path B: Cannot automate → prepare description → comment → transition → slack
    {
      id: 'e12',
      source: 'can_automate',
      target: 'ai_prepare_description',
      label: 'false',
      condition: 'nodes.can_automate.result == false',
    },
    {
      id: 'e13',
      source: 'ai_prepare_description',
      target: 'jira_comment_manual',
    },
    {
      id: 'e14',
      source: 'jira_comment_manual',
      target: 'jira_transition_manual',
    },
    {
      id: 'e15',
      source: 'jira_transition_manual',
      target: 'slack_notify_manual',
    },
  ],
};

/**
 * Workflow metadata for registration
 */
export const AI_JIRA_DEVELOPER_METADATA = {
  name: 'AI Jira Developer',
  description:
    'Automatically processes Jira issues when AI component is added. AI analyzes the task, and either completes it automatically (creating branch, commits, MR) or prepares a detailed technical description for human developers. Repository is automatically matched based on JIRA component, label, or a static name.',
  category: 'automation',
  tags: ['jira', 'ai', 'git', 'automation', 'code-generation'],
  requiredIntegrations: ['jira', 'gitlab', 'slack', 'ai'],
  variables: {
    slack_channel: {
      type: 'string',
      description: 'Slack channel for notifications',
      default: '#ai-dev-notifications',
    },
    target_branch: {
      type: 'string',
      description: 'Target branch for merge requests',
      default: 'develop',
    },
    repository_match_field: {
      type: 'string',
      description:
        'How to match repository: "jira_component" (first component), "jira_label" (first label), or "static" (use repository_name)',
      default: 'jira_component',
    },
    repository_name: {
      type: 'string',
      description:
        'Static repository name (only used when repository_match_field is "static")',
      default: '',
    },
  },
};
