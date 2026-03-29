// Workflow types

import type { Project } from "./project";

export type TriggerType = "manual" | "schedule" | "webhook" | "event";
export type NodeType = "trigger" | "action" | "condition" | "delay" | "loop";
export type ActionType =
  | "ai_process"
  | "http_request"
  | "send_email"
  | "send_slack"
  | "create_task"
  | "update_task"
  | "run_script";

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  next?: string[];
  onError?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowDefinition {
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  definition: WorkflowDefinition;
  isActive: boolean;
  version: number;
  projectId: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  _count?: {
    executions: number;
  };
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  triggerType?: TriggerType;
  triggerConfig?: Record<string, unknown>;
  definition?: WorkflowDefinition;
  projectId?: string;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
}

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggerData: Record<string, unknown>;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  currentNode?: string;
  workflow?: Workflow;
}

export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeName?: string | null;
  nodeType?: string | null;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: Record<string, unknown>;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface WorkflowTemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
}

export interface WorkflowTemplate extends WorkflowTemplateMetadata {
  workflow: WorkflowDefinition;
}

export interface CreateFromTemplateDto {
  templateId: string;
  name?: string;
  description?: string;
  projectId?: string;
  variables?: Record<string, unknown>;
}
