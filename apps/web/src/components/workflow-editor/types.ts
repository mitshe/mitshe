import { Node, Edge } from "@xyflow/react";

export type NodeType =
  | "trigger:webhook"
  | "trigger:schedule"
  | "trigger:jira_issue"
  | "trigger:jira_component_added"
  | "trigger:jira_label_added"
  | "trigger:youtrack_issue"
  | "trigger:youtrack_tag_added"
  | "trigger:obsidian_note_created"
  | "trigger:obsidian_note_updated"
  | "trigger:git_push"
  | "trigger:git_mr"
  | "trigger:manual"
  | "action:ai_prompt"
  | "action:ai_chat"
  | "action:ai_analyze"
  | "action:ai_code_review"
  | "action:ai_code_task"
  | "action:jira_create_issue"
  | "action:jira_update_issue"
  | "action:jira_transition"
  | "action:jira_add_comment"
  | "action:youtrack_create_issue"
  | "action:youtrack_update_issue"
  | "action:youtrack_transition"
  | "action:youtrack_add_comment"
  | "action:obsidian_create_note"
  | "action:obsidian_update_note"
  | "action:obsidian_append_note"
  | "action:git_create_branch"
  | "action:git_commit"
  | "action:git_create_mr"
  | "action:git_merge_mr"
  | "action:git_add_comment"
  | "action:task_create"
  | "action:task_update"
  | "action:task_assign"
  | "action:slack_message"
  | "action:slack_channel"
  | "action:discord_message"
  | "action:discord_embed"
  | "action:telegram_message"
  | "action:email"
  | "control:condition"
  | "control:switch"
  | "control:loop"
  | "control:parallel"
  | "control:wait"
  | "control:delay"
  | "transform:set_variable"
  | "transform:map"
  | "transform:filter"
  | "transform:aggregate"
  | "data:get_repository"
  | "data:find_repository"
  | "data:get_jira_issue"
  | "data:get_youtrack_issue"
  | "data:get_obsidian_note"
  | "data:search_obsidian_notes"
  | "action:session_create"
  | "action:session_exec"
  | "action:session_agent"
  | "action:session_stop"
  | "action:session_read_file"
  | "action:session_write_file"
  | "data:session_git_diff"
  | "data:session_files"
  | "utility:http_request"
  | "utility:script";

export type NodeCategory =
  | "triggers"
  | "data"
  | "ai"
  | "jira"
  | "youtrack"
  | "obsidian"
  | "git"
  | "tasks"
  | "notifications"
  | "sessions"
  | "control"
  | "transform"
  | "utility";

export type NodeProvider =
  | "jira"
  | "youtrack"
  | "git"
  | "gitlab"
  | "github"
  | "slack"
  | "discord"
  | "telegram"
  | "email"
  | "obsidian"
  | "ai"
  | null;

export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  defaultConfig: Record<string, unknown>;
  provider?: NodeProvider; // Badge to show (JIRA, Git, etc.)
}

export interface WorkflowNodeData {
  label: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  description?: string;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData, "workflow">;

export interface WorkflowEdge extends Edge {
  condition?: string;
  label?: string;
}

export interface WorkflowDefinition {
  version: "1.0";
  nodes: {
    id: string;
    type: NodeType;
    name: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
    next?: string[];
    onError?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    condition?: string;
  }[];
  variables?: Record<string, unknown>;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // === TRIGGERS ===
  {
    type: "trigger:manual",
    label: "Manual Trigger",
    description: "Start workflow manually",
    category: "triggers",
    icon: "Play",
    color: "#10b981",
    defaultConfig: {},
  },
  {
    type: "trigger:webhook",
    label: "Webhook",
    description: "Trigger on incoming webhook",
    category: "triggers",
    icon: "Webhook",
    color: "#10b981",
    defaultConfig: { eventType: "" },
  },
  {
    type: "trigger:schedule",
    label: "Schedule",
    description: "Trigger on a schedule",
    category: "triggers",
    icon: "Clock",
    color: "#10b981",
    defaultConfig: { cron: "0 9 * * *" },
  },
  {
    type: "trigger:jira_issue",
    label: "Issue Event",
    description: "Trigger on issue events",
    category: "triggers",
    icon: "Ticket",
    color: "#0052cc",
    defaultConfig: { projectKey: "", events: ["created", "updated"] },
    provider: "jira",
  },
  {
    type: "trigger:jira_component_added",
    label: "Component Added",
    description: "When component is added to issue",
    category: "triggers",
    icon: "Component",
    color: "#0052cc",
    defaultConfig: { component: "AI", projectKey: "" },
    provider: "jira",
  },
  {
    type: "trigger:jira_label_added",
    label: "Label Added",
    description: "When label is added to issue",
    category: "triggers",
    icon: "Tag",
    color: "#0052cc",
    defaultConfig: { label: "AI", projectKey: "" },
    provider: "jira",
  },
  {
    type: "trigger:youtrack_issue",
    label: "Issue Event",
    description: "Trigger on YouTrack issue events",
    category: "triggers",
    icon: "Ticket",
    color: "#8b5cf6",
    defaultConfig: { projectId: "", events: ["created", "updated"] },
    provider: "youtrack",
  },
  {
    type: "trigger:youtrack_tag_added",
    label: "Tag Added",
    description: "When tag is added to issue",
    category: "triggers",
    icon: "Tag",
    color: "#8b5cf6",
    defaultConfig: { tag: "AI", projectId: "" },
    provider: "youtrack",
  },
  {
    type: "trigger:obsidian_note_created",
    label: "Note Created",
    description: "When a new note is created",
    category: "triggers",
    icon: "FileText",
    color: "#7c3aed",
    defaultConfig: { vault: "", folder: "" },
    provider: "obsidian",
  },
  {
    type: "trigger:obsidian_note_updated",
    label: "Note Updated",
    description: "When a note is modified",
    category: "triggers",
    icon: "FileEdit",
    color: "#7c3aed",
    defaultConfig: { vault: "", folder: "", pattern: "" },
    provider: "obsidian",
  },
  {
    type: "trigger:git_push",
    label: "Push",
    description: "Trigger on git push",
    category: "triggers",
    icon: "GitCommit",
    color: "#f97316",
    defaultConfig: { branch: "main" },
    provider: "git",
  },
  {
    type: "trigger:git_mr",
    label: "Merge Request",
    description: "Trigger on merge/pull request",
    category: "triggers",
    icon: "GitPullRequest",
    color: "#f97316",
    defaultConfig: { events: ["opened", "merged"] },
    provider: "git",
  },
  // === DATA ===
  {
    type: "data:get_repository",
    label: "Get Repository",
    description: "Get repository by ID",
    category: "data",
    icon: "Database",
    color: "#f97316",
    defaultConfig: { repositoryId: "" },
    provider: "git",
  },
  {
    type: "data:find_repository",
    label: "Find Repository",
    description: "Search repository by name",
    category: "data",
    icon: "Search",
    color: "#f97316",
    defaultConfig: {
      name: "",
      nameContains: "",
      fullPath: "",
      fullPathContains: "",
    },
    provider: "git",
  },
  {
    type: "data:get_jira_issue",
    label: "Get Issue",
    description: "Fetch JIRA issue data",
    category: "data",
    icon: "Ticket",
    color: "#0052cc",
    defaultConfig: { issueKey: "" },
    provider: "jira",
  },
  {
    type: "data:get_youtrack_issue",
    label: "Get Issue",
    description: "Fetch YouTrack issue data",
    category: "data",
    icon: "Ticket",
    color: "#8b5cf6",
    defaultConfig: { issueId: "" },
    provider: "youtrack",
  },
  {
    type: "data:get_obsidian_note",
    label: "Get Note",
    description: "Fetch note content",
    category: "data",
    icon: "FileText",
    color: "#7c3aed",
    defaultConfig: { vault: "", path: "" },
    provider: "obsidian",
  },
  {
    type: "data:search_obsidian_notes",
    label: "Search Notes",
    description: "Search notes by query",
    category: "data",
    icon: "Search",
    color: "#7c3aed",
    defaultConfig: { vault: "", query: "", folder: "" },
    provider: "obsidian",
  },
  // === AI ===
  {
    type: "action:ai_prompt",
    label: "AI Prompt",
    description: "Send a prompt to AI",
    category: "ai",
    icon: "Sparkles",
    color: "#8b5cf6",
    defaultConfig: {
      aiCredentialId: "",
      prompt: "",
      systemPrompt: "",
      maxTokens: 4096,
    },
    provider: "ai",
  },
  {
    type: "action:ai_chat",
    label: "AI Chat",
    description: "Multi-turn AI conversation",
    category: "ai",
    icon: "MessageSquare",
    color: "#8b5cf6",
    defaultConfig: { aiCredentialId: "", messages: [], systemPrompt: "" },
    provider: "ai",
  },
  {
    type: "action:ai_analyze",
    label: "AI Analyze",
    description: "Analyze content with AI",
    category: "ai",
    icon: "Search",
    color: "#8b5cf6",
    defaultConfig: { aiCredentialId: "", content: "", schema: "" },
    provider: "ai",
  },
  {
    type: "action:ai_code_review",
    label: "Code Review",
    description: "AI-powered code review",
    category: "ai",
    icon: "Code",
    color: "#8b5cf6",
    defaultConfig: { aiCredentialId: "", diff: "" },
    provider: "ai",
  },
  {
    type: "action:ai_code_task",
    label: "AI Code Task",
    description: "Generate code from task description",
    category: "ai",
    icon: "Wand2",
    color: "#8b5cf6",
    defaultConfig: {
      aiCredentialId: "",
      task: "",
      workingDirectory: "",
    },
    provider: "ai",
  },
  // === JIRA ===
  {
    type: "action:jira_create_issue",
    label: "Create Issue",
    description: "Create a new issue",
    category: "jira",
    icon: "PlusCircle",
    color: "#0052cc",
    defaultConfig: {
      projectKey: "",
      issueType: "Task",
      summary: "",
      description: "",
    },
    provider: "jira",
  },
  {
    type: "action:jira_update_issue",
    label: "Update Issue",
    description: "Update an existing issue",
    category: "jira",
    icon: "Edit",
    color: "#0052cc",
    defaultConfig: { issueKey: "" },
    provider: "jira",
  },
  {
    type: "action:jira_transition",
    label: "Transition Issue",
    description: "Change issue status",
    category: "jira",
    icon: "ArrowRight",
    color: "#0052cc",
    defaultConfig: { issueKey: "", transitionId: "" },
    provider: "jira",
  },
  {
    type: "action:jira_add_comment",
    label: "Add Comment",
    description: "Add comment to issue",
    category: "jira",
    icon: "MessageCircle",
    color: "#0052cc",
    defaultConfig: { issueKey: "", comment: "" },
    provider: "jira",
  },
  // === YOUTRACK ===
  {
    type: "action:youtrack_create_issue",
    label: "Create Issue",
    description: "Create a new YouTrack issue",
    category: "youtrack",
    icon: "PlusCircle",
    color: "#8b5cf6",
    defaultConfig: {
      projectId: "",
      summary: "",
      description: "",
    },
    provider: "youtrack",
  },
  {
    type: "action:youtrack_update_issue",
    label: "Update Issue",
    description: "Update an existing issue",
    category: "youtrack",
    icon: "Edit",
    color: "#8b5cf6",
    defaultConfig: { issueId: "" },
    provider: "youtrack",
  },
  {
    type: "action:youtrack_transition",
    label: "Change State",
    description: "Change issue state",
    category: "youtrack",
    icon: "ArrowRight",
    color: "#8b5cf6",
    defaultConfig: { issueId: "", state: "" },
    provider: "youtrack",
  },
  {
    type: "action:youtrack_add_comment",
    label: "Add Comment",
    description: "Add comment to issue",
    category: "youtrack",
    icon: "MessageCircle",
    color: "#8b5cf6",
    defaultConfig: { issueId: "", comment: "" },
    provider: "youtrack",
  },
  // === OBSIDIAN ===
  {
    type: "action:obsidian_create_note",
    label: "Create Note",
    description: "Create a new note",
    category: "obsidian",
    icon: "FilePlus",
    color: "#7c3aed",
    defaultConfig: {
      vault: "",
      path: "",
      content: "",
      frontmatter: {},
    },
    provider: "obsidian",
  },
  {
    type: "action:obsidian_update_note",
    label: "Update Note",
    description: "Update note content",
    category: "obsidian",
    icon: "FileEdit",
    color: "#7c3aed",
    defaultConfig: { vault: "", path: "", content: "" },
    provider: "obsidian",
  },
  {
    type: "action:obsidian_append_note",
    label: "Append to Note",
    description: "Append content to existing note",
    category: "obsidian",
    icon: "FileOutput",
    color: "#7c3aed",
    defaultConfig: { vault: "", path: "", content: "", position: "end" },
    provider: "obsidian",
  },
  // === GIT ===
  {
    type: "action:git_create_branch",
    label: "Create Branch",
    description: "Create a new branch",
    category: "git",
    icon: "GitBranch",
    color: "#f97316",
    defaultConfig: { branchName: "" },
    provider: "git",
  },
  {
    type: "action:git_commit",
    label: "Commit Files",
    description: "Commit files to branch",
    category: "git",
    icon: "GitCommit",
    color: "#f97316",
    defaultConfig: { message: "" },
    provider: "git",
  },
  {
    type: "action:git_create_mr",
    label: "Create MR/PR",
    description: "Create merge/pull request",
    category: "git",
    icon: "GitPullRequest",
    color: "#f97316",
    defaultConfig: { title: "", description: "" },
    provider: "git",
  },
  {
    type: "action:git_merge_mr",
    label: "Merge MR/PR",
    description: "Merge a merge/pull request",
    category: "git",
    icon: "GitMerge",
    color: "#f97316",
    defaultConfig: {},
    provider: "git",
  },
  // === NOTIFICATIONS ===
  {
    type: "action:slack_message",
    label: "Send Message",
    description: "Send a Slack message",
    category: "notifications",
    icon: "MessageSquare",
    color: "#4a154b",
    defaultConfig: { channel: "", message: "" },
    provider: "slack",
  },
  {
    type: "action:discord_message",
    label: "Discord Message",
    description: "Send a Discord message via webhook",
    category: "notifications",
    icon: "MessageSquare",
    color: "#5865f2",
    defaultConfig: { message: "", username: "" },
    provider: "discord",
  },
  {
    type: "action:discord_embed",
    label: "Discord Embed",
    description: "Send a rich Discord embed",
    category: "notifications",
    icon: "Bot",
    color: "#5865f2",
    defaultConfig: { title: "", description: "", color: 5865490, fields: [] },
    provider: "discord",
  },
  {
    type: "action:telegram_message",
    label: "Telegram Message",
    description: "Send a Telegram message",
    category: "notifications",
    icon: "MessageCircle",
    color: "#0088cc",
    defaultConfig: { message: "", chatId: "", parseMode: "HTML" },
    provider: "telegram",
  },
  {
    type: "action:email",
    label: "Send Email",
    description: "Send an email",
    category: "notifications",
    icon: "Mail",
    color: "#e11d48",
    defaultConfig: { to: "", subject: "", body: "" },
    provider: "email",
  },
  // === CONTROL FLOW ===
  {
    type: "control:condition",
    label: "Condition",
    description: "Branch based on condition",
    category: "control",
    icon: "GitFork",
    color: "#6366f1",
    defaultConfig: { condition: "" },
  },
  {
    type: "control:switch",
    label: "Switch",
    description: "Multiple condition branches",
    category: "control",
    icon: "Route",
    color: "#6366f1",
    defaultConfig: { value: "", cases: {} },
  },
  {
    type: "control:loop",
    label: "Loop",
    description: "Iterate over items",
    category: "control",
    icon: "Repeat",
    color: "#6366f1",
    defaultConfig: { items: "" },
  },
  {
    type: "control:parallel",
    label: "Parallel",
    description: "Execute in parallel",
    category: "control",
    icon: "Split",
    color: "#6366f1",
    defaultConfig: {},
  },
  {
    type: "control:delay",
    label: "Delay",
    description: "Wait for duration",
    category: "control",
    icon: "Timer",
    color: "#6366f1",
    defaultConfig: { delay: 1000 },
  },
  // === TRANSFORM ===
  {
    type: "transform:set_variable",
    label: "Set Variable",
    description: "Set a workflow variable",
    category: "transform",
    icon: "Variable",
    color: "#14b8a6",
    defaultConfig: { name: "", value: "" },
  },
  {
    type: "transform:map",
    label: "Map",
    description: "Transform array items",
    category: "transform",
    icon: "Map",
    color: "#14b8a6",
    defaultConfig: { items: "", template: {} },
  },
  {
    type: "transform:filter",
    label: "Filter",
    description: "Filter array items",
    category: "transform",
    icon: "Filter",
    color: "#14b8a6",
    defaultConfig: { items: "", condition: "" },
  },
  // === UTILITY ===
  {
    type: "utility:http_request",
    label: "HTTP Request",
    description: "Make an HTTP request",
    category: "utility",
    icon: "Globe",
    color: "#64748b",
    defaultConfig: { url: "", method: "GET", headers: {}, body: null },
  },
  {
    type: "utility:script",
    label: "Script",
    description: "Run custom expression",
    category: "utility",
    icon: "Terminal",
    color: "#64748b",
    defaultConfig: { expression: "" },
  },

  // ─── Sessions ────────────────────────────────────────────────
  {
    type: "action:session_create",
    label: "Create Session",
    description: "Create and start a new agent session with repositories",
    category: "sessions",
    icon: "Plus",
    color: "#06b6d4",
    defaultConfig: {
      name: "",
      repositoryIds: [],
      presetId: "",
      environmentId: "",
      instructions: "",
    },
  },
  {
    type: "action:session_exec",
    label: "Run Command",
    description: "Execute a shell command in a session container",
    category: "sessions",
    icon: "Terminal",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", command: "", timeout: 60000 },
  },
  {
    type: "action:session_agent",
    label: "Run Agent Task",
    description: "Start AI agent with a prompt and wait for result",
    category: "sessions",
    icon: "Bot",
    color: "#06b6d4",
    defaultConfig: {
      sessionId: "{{ctx.sessionId}}",
      prompt: "",
      provider: "claude",
      startArguments: "",
      timeout: 300000,
    },
  },
  {
    type: "action:session_stop",
    label: "Stop Session",
    description: "Stop and optionally delete a session",
    category: "sessions",
    icon: "Square",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", delete: false },
  },
  {
    type: "action:session_read_file",
    label: "Read File",
    description: "Read file content from a session container",
    category: "sessions",
    icon: "FileText",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", path: "" },
  },
  {
    type: "action:session_write_file",
    label: "Write File",
    description: "Write content to a file in a session container",
    category: "sessions",
    icon: "FileEdit",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", path: "", content: "" },
  },
  {
    type: "data:session_git_diff",
    label: "Get Git Diff",
    description: "Get git diff from session workspace",
    category: "sessions",
    icon: "GitBranch",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", staged: false },
  },
  {
    type: "data:session_files",
    label: "List Files",
    description: "List files in session workspace",
    category: "sessions",
    icon: "FolderTree",
    color: "#06b6d4",
    defaultConfig: { sessionId: "{{ctx.sessionId}}", path: "" },
  },
];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  triggers: "Triggers",
  data: "Data",
  ai: "AI Actions",
  jira: "JIRA",
  youtrack: "YouTrack",
  obsidian: "Obsidian",
  git: "Git",
  tasks: "Tasks",
  notifications: "Notifications",
  sessions: "Sessions",
  control: "Control Flow",
  transform: "Transform",
  utility: "Utility",
};

export function getNodesByCategory(): Record<NodeCategory, NodeDefinition[]> {
  return NODE_DEFINITIONS.reduce(
    (acc, node) => {
      if (!acc[node.category]) {
        acc[node.category] = [];
      }
      acc[node.category].push(node);
      return acc;
    },
    {} as Record<NodeCategory, NodeDefinition[]>,
  );
}
