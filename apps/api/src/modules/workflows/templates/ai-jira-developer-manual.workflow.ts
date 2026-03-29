import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * AI Jira Developer Workflow (Manual Trigger)
 *
 * Trigger: Manual - user imports a JIRA task and clicks "Run Workflow"
 * Flow:
 * 1. Use task data (already imported from JIRA)
 * 2. Find repository based on JIRA component/label
 * 3. Run AI analysis to determine if task can be automated
 * 4. If simple task (AI can handle):
 *    → Create branch → AI executes → commits → MR → Jira transition → Slack
 * 5. If complex task (needs developer):
 *    → AI prepares technical description → comments on Jira → Slack notification
 *    (No branch created, no status change - just analysis and notification)
 *
 * Data sources:
 * - task.* - imported task info (id, title, externalIssueId, etc.)
 * - jira.* - full JIRA issue data (summary, description, labels, etc.)
 *
 * Branch naming: ai-{issueKey} (e.g., ai-ee-12345) - only when AI automates
 * Commit format: [{issueKey}] {description}
 */
export const AI_JIRA_DEVELOPER_MANUAL_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    slack_channel: '#ai-dev-notifications',
    // Repository matching - flexible options:
    // Option 1: Match by JIRA component (default)
    repository_match_field: 'jira_component', // 'jira_component' | 'jira_label' | 'static'
    // Option 2: Static repository name (if repository_match_field is 'static')
    repository_name: '',
  },
  nodes: [
    // ============================================
    // TRIGGER: Manual - user clicks "Run Workflow"
    // ============================================
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Manual Trigger',
      position: { x: 100, y: 300 },
      config: {},
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
        // Supports: jira_component, jira_label, or static name
        // Note: jira.components is an array of {id, name} objects
        // All outputs are automatically available via ctx.* in subsequent nodes
        expression: `{
          "branchName": "ai-" + task.externalIssueId.toLowerCase(),
          "issueKey": task.externalIssueId,
          "issueSummary": jira.summary || task.title,
          "issueUrl": task.externalIssueUrl || "",
          "repoSearchName": vars.repository_match_field === "jira_component"
            ? (jira.components && jira.components[0] ? jira.components[0].name : "")
            : (vars.repository_match_field === "jira_label"
              ? (jira.labels && jira.labels[0] ? jira.labels[0] : "")
              : vars.repository_name)
        }`,
      },
    },

    // ============================================
    // FIND REPOSITORY: Search by name from JIRA data
    // ============================================
    {
      id: 'find_repo',
      type: 'data:find_repository',
      name: 'Find Repository',
      position: { x: 400, y: 300 },
      config: {
        // Search by name containing the value extracted from JIRA
        nameContains: '{{ctx.repoSearchName}}',
      },
    },

    // ============================================
    // AI ANALYSIS: Determine task complexity
    // (Repository found but branch NOT yet created - only create if AI will work on it)
    // ============================================
    {
      id: 'ai_analyze',
      type: 'action:ai_analyze',
      name: 'Analyze Task Complexity',
      position: { x: 600, y: 300 },
      config: {
        content: `
Analyze the following Jira task and determine if it can be automated by AI:

**Issue Key:** {{ctx.issueKey}}
**Title:** {{ctx.issueSummary}}
**Description:**
{{jira.description || task.description}}

**Labels:** {{jira.labels}}
**Priority:** {{jira.priority}}
**Status:** {{jira.status}}

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
      position: { x: 800, y: 300 },
      config: {
        condition:
          'nodes.ai_analyze.analysis.canAutomate == true && nodes.ai_analyze.analysis.confidence >= 70',
      },
    },

    // ============================================
    // PATH A: AI EXECUTES THE TASK
    // ============================================

    // CREATE BRANCH: Only when AI will actually work on the task
    {
      id: 'create_branch',
      type: 'action:git_create_branch',
      name: 'Create AI Branch',
      position: { x: 1000, y: 150 },
      config: {
        branchName: '{{ctx.branchName}}',
        sourceBranch: '{{ctx.defaultBranch}}',
      },
    },

    {
      id: 'ai_execute',
      type: 'action:ai_code_task',
      name: 'AI Execute Task',
      position: { x: 1200, y: 150 },
      config: {
        task: `
You are an expert software developer. Your task is to implement the following Jira issue.

## TASK DETAILS
**Issue Key:** {{ctx.issueKey}}
**Title:** {{ctx.issueSummary}}
**Description:**
{{jira.description || task.description}}

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
      position: { x: 1400, y: 150 },
      config: {
        message: '[{{ctx.issueKey}}] {{ctx.issueSummary}}',
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
      position: { x: 1600, y: 150 },
      config: {
        title: '[{{ctx.issueKey}}] {{ctx.issueSummary}}',
        description: `
## Summary
This MR was automatically generated by AI to address Jira issue [{{ctx.issueKey}}]({{ctx.issueUrl}}).

## Task Description
{{jira.description || task.description}}

## Changes Made
{{nodes.ai_execute.content}}

## Testing Instructions
Please review the changes and test according to the acceptance criteria in the Jira issue.

---
🤖 *Generated by AI Developer Workflow*
`,
        targetBranch: '{{ctx.defaultBranch}}',
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
      position: { x: 1800, y: 150 },
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
      position: { x: 2000, y: 150 },
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
      position: { x: 2200, y: 150 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: `
✅ *AI Developer completed task*

*Issue:* <{{ctx.issueUrl}}|{{ctx.issueKey}}> - {{ctx.issueSummary}}
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
      position: { x: 1200, y: 450 },
      config: {
        systemPrompt: `You are a senior software architect helping developers understand complex tasks.
Your role is to analyze Jira issues and provide clear, actionable guidance for developers.
Be specific about technical challenges, suggest approaches, and highlight potential pitfalls.`,
        prompt: `
Analyze this Jira task and prepare a detailed technical description for a developer.

## TASK DETAILS
**Issue Key:** {{ctx.issueKey}}
**Title:** {{ctx.issueSummary}}
**Description:**
{{jira.description || task.description}}

**Labels:** {{jira.labels}}
**Priority:** {{jira.priority}}
**Status:** {{jira.status}}

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
      position: { x: 1400, y: 450 },
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

A developer should pick up this task.
`,
      },
    },

    // ============================================
    // SLACK: Notify about manual task
    // ============================================
    {
      id: 'slack_notify_manual',
      type: 'action:slack_message',
      name: 'Notify Manual Task',
      position: { x: 1600, y: 450 },
      config: {
        channel: '{{vars.slack_channel}}',
        message: `
⚠️ *AI Developer needs human help*

*Issue:* <{{ctx.issueUrl}}|{{ctx.issueKey}}> - {{ctx.issueSummary}}
*Complexity:* {{nodes.ai_analyze.analysis.complexity}}
*Confidence:* {{nodes.ai_analyze.analysis.confidence}}%

*Why automation failed:*
> {{nodes.ai_analyze.analysis.reasoning}}

A technical analysis has been added to the Jira issue. Developer assistance needed! 👨‍💻
`,
      },
    },
  ],

  edges: [
    // Main flow: trigger → prepare → find_repo → analyze → condition
    { id: 'e0', source: 'trigger', target: 'prepare_data' },
    { id: 'e1', source: 'prepare_data', target: 'find_repo' },
    { id: 'e2', source: 'find_repo', target: 'ai_analyze' },
    { id: 'e3', source: 'ai_analyze', target: 'can_automate' },

    // Path A: Can automate → create_branch → execute → commit → MR → transition → comment → slack
    {
      id: 'e4',
      source: 'can_automate',
      target: 'create_branch',
      label: 'true',
      condition: 'nodes.can_automate.result == true',
    },
    { id: 'e5', source: 'create_branch', target: 'ai_execute' },
    { id: 'e6', source: 'ai_execute', target: 'create_commit' },
    { id: 'e7', source: 'create_commit', target: 'create_mr' },
    { id: 'e8', source: 'create_mr', target: 'jira_transition' },
    { id: 'e9', source: 'jira_transition', target: 'jira_comment_done' },
    { id: 'e10', source: 'jira_comment_done', target: 'slack_notify_done' },

    // Path B: Cannot automate → prepare description → comment → slack (no transition, no branch)
    {
      id: 'e11',
      source: 'can_automate',
      target: 'ai_prepare_description',
      label: 'false',
      condition: 'nodes.can_automate.result == false',
    },
    {
      id: 'e12',
      source: 'ai_prepare_description',
      target: 'jira_comment_manual',
    },
    { id: 'e13', source: 'jira_comment_manual', target: 'slack_notify_manual' },
  ],
};

/**
 * Workflow metadata for registration
 */
export const AI_JIRA_DEVELOPER_MANUAL_METADATA = {
  name: 'AI Jira Developer (Manual)',
  description:
    'Manually triggered workflow for imported JIRA tasks. AI analyzes task complexity: if automatable, creates branch + commits + MR; if too complex, adds technical analysis comment to JIRA and notifies Slack (no branch created). Repository matched by JIRA component/label.',
  category: 'automation',
  tags: ['jira', 'ai', 'git', 'automation', 'code-generation', 'manual'],
  requiredIntegrations: ['jira', 'gitlab', 'slack', 'ai'],
  variables: {
    slack_channel: {
      type: 'string',
      description: 'Slack channel for notifications',
      default: '#ai-dev-notifications',
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
