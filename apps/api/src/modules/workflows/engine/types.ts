/**
 * Workflow Engine Types
 */

// Node Types - all available node types in the workflow editor
export type NodeType =
  // Triggers
  | 'trigger:webhook'
  | 'trigger:schedule'
  | 'trigger:jira_issue'
  | 'trigger:jira_component_added'
  | 'trigger:jira_status_change'
  | 'trigger:jira_issue_created'
  | 'trigger:youtrack_issue'
  | 'trigger:youtrack_issue_created'
  | 'trigger:youtrack_status_change'
  | 'trigger:git_push'
  | 'trigger:git_mr'
  | 'trigger:github_issue'
  | 'trigger:github_pr'
  | 'trigger:linear_issue'
  | 'trigger:discord_message'
  | 'trigger:manual'
  // AI Actions
  | 'action:ai_prompt'
  | 'action:ai_chat'
  | 'action:ai_analyze'
  | 'action:ai_code_review'
  | 'action:ai_code_task'
  | 'action:ai_summarize'
  | 'action:ai_translate'
  // JIRA Actions
  | 'action:jira_create_issue'
  | 'action:jira_update_issue'
  | 'action:jira_transition'
  | 'action:jira_add_comment'
  // YouTrack Actions
  | 'action:youtrack_create_issue'
  | 'action:youtrack_update_issue'
  | 'action:youtrack_transition'
  | 'action:youtrack_add_comment'
  // Linear Actions
  | 'action:linear_create_issue'
  | 'action:linear_update_issue'
  | 'action:linear_add_comment'
  // Git Actions
  | 'action:git_create_branch'
  | 'action:git_commit'
  | 'action:git_create_mr'
  | 'action:git_merge_mr'
  | 'action:git_add_comment'
  // GitHub Actions
  | 'action:github_create_issue'
  | 'action:github_create_pr'
  | 'action:github_add_comment'
  | 'action:github_add_label'
  // Task Actions
  | 'action:task_create'
  | 'action:task_update'
  | 'action:task_assign'
  // Notification Actions
  | 'action:slack_message'
  | 'action:slack_channel'
  | 'action:discord_message'
  | 'action:discord_embed'
  | 'action:telegram_message'
  | 'action:email'
  | 'action:webhook_send'
  // Obsidian Actions
  | 'action:obsidian_get_note'
  | 'action:obsidian_create_note'
  | 'action:obsidian_update_note'
  | 'action:obsidian_append_note'
  // Flow Control
  | 'control:condition'
  | 'control:switch'
  | 'control:loop'
  | 'control:parallel'
  | 'control:wait'
  | 'control:delay'
  | 'control:merge'
  | 'control:split'
  | 'control:error_handler'
  | 'control:retry'
  // Data Transform
  | 'transform:set_variable'
  | 'transform:map'
  | 'transform:filter'
  | 'transform:aggregate'
  | 'transform:sort'
  | 'transform:limit'
  | 'transform:json_parse'
  | 'transform:json_stringify'
  // Data Fetching
  | 'data:get_repository'
  | 'data:find_repository'
  | 'data:get_jira_issue'
  | 'data:get_youtrack_issue'
  | 'data:get_linear_issue'
  | 'data:get_github_issue'
  | 'data:search_obsidian'
  // Utility
  | 'utility:http_request'
  | 'utility:script'
  | 'utility:log'
  | 'utility:debug';

// Workflow Node
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  next?: string[];
  onError?: string;
}

// Workflow Edge
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // Expression for conditional routing
  label?: string; // Label for display/condition matching (e.g., 'true', 'false')
}

// Workflow Definition (stored in DB)
export interface WorkflowDefinition {
  version: '1.0';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
}

// Execution Status
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

// Node Execution Status
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

// Node Execution Result
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

// Workflow Context - tracks current working state across nodes
export interface WorkflowContext {
  // Git context
  repositoryId?: string;
  repositoryName?: string;
  repositoryFullPath?: string; // owner/repo format for API calls
  branch?: string;
  defaultBranch?: string;
  cloneUrl?: string;
  webUrl?: string;
  integrationId?: string; // Integration ID for git provider (GitLab/GitHub)
  provider?: string; // Git provider type (GITLAB/GITHUB)
  // MR context
  mrId?: string;
  mrUrl?: string;
  // Files context (from AI or other sources)
  files?: Array<{ path: string; content: string; action?: string }>;
  // JIRA context
  issueKey?: string;
  issueUrl?: string;
  // Task context
  taskId?: string;
  taskDescription?: string;
}

// Execution Context - holds all data during execution
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  organizationId: string;
  triggerData: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  currentNodeId?: string;
  status: ExecutionStatus;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  nodeExecutions: NodeExecutionResult[];
  // Workflow context - auto-populated values
  workflowContext: WorkflowContext;
}

// Node Executor Interface
export interface INodeExecutor {
  nodeType: NodeType | NodeType[];
  execute(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult>;
}

// Expression Context for evaluating templates and conditions
export interface ExpressionContext {
  trigger: Record<string, unknown>;
  vars: Record<string, unknown>;
  nodes: Record<string, Record<string, unknown>>;
  env?: Record<string, string>;
  // Workflow context for automatic data flow between nodes
  ctx?: Record<string, unknown>;
}
