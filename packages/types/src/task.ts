// Task types

import type { Project } from "./project";

export type TaskStatus =
  | "PENDING"
  | "ANALYZING"
  | "IN_PROGRESS"
  | "REVIEW"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  projectId: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  externalSource?: string | null;
  externalIssueId?: string | null;
  externalIssueUrl?: string | null;
  externalData?: Record<string, unknown> | null;
  externalStatus?: string | null;
  result?: Record<string, unknown> | null;
  agentLogs?: Record<string, unknown>[] | null;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface JiraImportPreview {
  source: "JIRA";
  issueKey: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  issueType: string;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  components: { id: string; name: string }[];
  project: {
    key: string;
    name: string;
  };
  url: string;
  created: string;
  updated: string;
}

export interface ImportPreviewDto {
  url: string;
}

export interface ImportConfirmDto {
  url: string;
  projectId?: string;
}

export interface RunWorkflowDto {
  workflowId: string;
  additionalData?: Record<string, unknown>;
}
