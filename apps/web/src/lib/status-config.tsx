"use client";

import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Eye,
  Ban,
} from "lucide-react";
import type { TaskStatus } from "@/lib/api/types";
import type { ExecutionStatus } from "@/lib/api/types";

// ============================================================================
// TASK STATUS CONFIGURATION
// ============================================================================

export const taskStatusConfig: Record<
  TaskStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "outline" | "destructive";
    color: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    variant: "outline",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  ANALYZING: {
    label: "Analyzing",
    icon: <Search className="w-4 h-4 animate-pulse" />,
    variant: "secondary",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: "secondary",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  REVIEW: {
    label: "Review",
    icon: <Eye className="w-4 h-4" />,
    variant: "default",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: "default",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="w-4 h-4" />,
    variant: "destructive",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: <Ban className="w-4 h-4" />,
    variant: "outline",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

// Helper to get task status config safely
export function getTaskStatus(status: string) {
  return (
    taskStatusConfig[status as TaskStatus] || {
      label: status,
      icon: <AlertCircle className="w-4 h-4" />,
      variant: "outline" as const,
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
  );
}

// ============================================================================
// EXECUTION STATUS CONFIGURATION
// ============================================================================

export const executionStatusConfig: Record<
  ExecutionStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "outline" | "destructive";
    color: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    variant: "outline",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  running: {
    label: "Running",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: "secondary",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: "default",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-4 h-4" />,
    variant: "destructive",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: <Ban className="w-4 h-4" />,
    variant: "outline",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

// Helper to get execution status config safely
export function getExecutionStatus(status: string) {
  return (
    executionStatusConfig[status as ExecutionStatus] || {
      label: status,
      icon: <AlertCircle className="w-4 h-4" />,
      variant: "outline" as const,
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
  );
}

// ============================================================================
// NODE EXECUTION STATUS CONFIGURATION
// ============================================================================

export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export const nodeStatusConfig: Record<
  NodeExecutionStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "outline" | "destructive";
    color: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    variant: "outline",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  running: {
    label: "Running",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: "secondary",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: "default",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-4 h-4" />,
    variant: "destructive",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  skipped: {
    label: "Skipped",
    icon: <Ban className="w-4 h-4" />,
    variant: "outline",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

// Helper to get node status config safely
export function getNodeStatus(status: string) {
  return (
    nodeStatusConfig[status as NodeExecutionStatus] || {
      label: status,
      icon: <AlertCircle className="w-4 h-4" />,
      variant: "outline" as const,
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
  );
}

// ============================================================================
// PROVIDER LABELS
// ============================================================================

export const providerLabels: Record<string, string> = {
  CLAUDE: "Claude",
  OPENAI: "OpenAI",
  OPENROUTER: "OpenRouter",
  GEMINI: "Gemini",
  GROQ: "Groq",
  CLAUDE_CODE_LOCAL: "Claude Code",
  OPENCLAW: "OpenClaw",
};

// ============================================================================
// TRIGGER TYPE LABELS
// ============================================================================

export const triggerTypeLabels: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-blue-500/10 text-blue-600" },
  task: { label: "Task", color: "bg-amber-500/10 text-amber-600" },
  schedule: { label: "Scheduled", color: "bg-purple-500/10 text-purple-600" },
  webhook: { label: "Webhook", color: "bg-orange-500/10 text-orange-600" },
  event: { label: "Event", color: "bg-green-500/10 text-green-600" },
  jira_issue: { label: "JIRA Issue", color: "bg-blue-500/10 text-blue-600" },
  jira_component_added: { label: "JIRA Component", color: "bg-blue-500/10 text-blue-600" },
  jira_label_added: { label: "JIRA Label", color: "bg-blue-500/10 text-blue-600" },
  git_push: { label: "Git Push", color: "bg-orange-500/10 text-orange-600" },
  git_mr: { label: "Merge Request", color: "bg-orange-500/10 text-orange-600" },
};

// ============================================================================
// PRIORITY CONFIGURATION
// ============================================================================

export type Priority = "low" | "medium" | "high" | "urgent";

export const priorityConfig: Record<
  Priority,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    color: string;
  }
> = {
  low: {
    label: "Low",
    variant: "outline",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
  medium: {
    label: "Medium",
    variant: "secondary",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  high: {
    label: "High",
    variant: "default",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  urgent: {
    label: "Urgent",
    variant: "destructive",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

// Helper to get priority config safely
export function getPriority(priority: string) {
  return (
    priorityConfig[priority as Priority] || {
      label: priority,
      variant: "outline" as const,
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
  );
}
