"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  RotateCcw,
  StopCircle,
  Play,
  GitBranch,
  MessageSquare,
  Zap,
  Bot,
  Webhook,
  Calendar,
  Radio,
  Terminal as TerminalIcon,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useWorkflow,
  useWorkflowExecutionDetails,
  useCancelExecution,
  useRetryExecution,
} from "@/lib/api/hooks";
import { useWorkflowExecution, useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import type { NodeExecutionResult } from "@/lib/api/types";

type NodeStatus = "pending" | "running" | "completed" | "failed" | "skipped";
type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

const statusConfig: Record<
  ExecutionStatus | NodeStatus,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  running: {
    label: "Running",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-600",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-600",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-zinc-800 dark:bg-zinc-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-zinc-500 dark:text-zinc-400",
    bgColor: "bg-zinc-500",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-zinc-400 dark:bg-zinc-600",
  },
  paused: {
    label: "Paused",
    icon: <Clock className="w-4 h-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500",
  },
  skipped: {
    label: "Skipped",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-zinc-400",
    bgColor: "bg-zinc-400",
  },
};

const nodeTypeIcons: Record<string, React.ReactNode> = {
  "trigger:manual": <Play className="w-4 h-4" />,
  "trigger:webhook": <Webhook className="w-4 h-4" />,
  "trigger:schedule": <Calendar className="w-4 h-4" />,
  "trigger:jira_issue": <Zap className="w-4 h-4" />,
  "trigger:git_push": <GitBranch className="w-4 h-4" />,
  "trigger:git_mr": <GitBranch className="w-4 h-4" />,
  "action:ai_prompt": <Bot className="w-4 h-4" />,
  "action:ai_analyze": <Bot className="w-4 h-4" />,
  "action:ai_chat": <Bot className="w-4 h-4" />,
  "action:git_create_branch": <GitBranch className="w-4 h-4" />,
  "action:git_commit": <GitBranch className="w-4 h-4" />,
  "action:git_create_mr": <GitBranch className="w-4 h-4" />,
  "action:slack_message": <MessageSquare className="w-4 h-4" />,
  "action:jira_update_issue": <Zap className="w-4 h-4" />,
  "action:jira_add_comment": <Zap className="w-4 h-4" />,
};

function formatDuration(durationMs?: number): string {
  if (!durationMs) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

function PipelineProgress({
  steps,
  nodes,
}: {
  steps: NodeExecutionResult[];
  nodes: Array<{ id: string; name: string; type: string }>;
}) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const running = steps.filter((s) => s.status === "running").length;
  const total = nodes.length;
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            running > 0
              ? "bg-blue-500"
              : failed > 0
                ? "bg-destructive"
                : "bg-emerald-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StepCard({
  step,
  nodeName,
  nodeType,
}: {
  step: NodeExecutionResult;
  nodeName: string;
  nodeType: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[step.status] || statusConfig.pending;
  const icon = nodeTypeIcons[nodeType] || <Zap className="w-4 h-4" />;
  const hasDetails = step.error || (step.output && Object.keys(step.output).length > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full text-left" disabled={!hasDetails}>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
            step.status === "running"
              ? "border-blue-500/30 bg-blue-500/5"
              : step.status === "failed"
                ? "border-destructive/20 bg-destructive/5"
                : "hover:bg-muted/50"
          }`}
        >
          <div className={status.color}>{icon}</div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{nodeName}</span>
            {step.error && (
              <p className="text-xs text-destructive truncate mt-0.5">
                {String(step.error)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(step.durationMs || (step.completedAt && step.startedAt)) ? (
              <span className="text-xs text-muted-foreground font-mono">
                {formatDuration(
                  step.durationMs ??
                  (step.completedAt && step.startedAt
                    ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
                    : undefined)
                )}
              </span>
            ) : null}
            {step.status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : step.status === "completed" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : step.status === "failed" ? (
              <XCircle className="w-4 h-4 text-destructive" />
            ) : (
              <Clock className="w-4 h-4 text-muted-foreground" />
            )}
            {hasDetails && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="mx-4 mb-2 mt-1 space-y-2">
            {step.error && (
              <pre className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive overflow-x-auto whitespace-pre-wrap font-mono">
                {String(step.error)}
              </pre>
            )}
            {step.output && Object.keys(step.output).length > 0 && (
              <pre className="p-3 bg-muted/50 border rounded-lg text-xs overflow-x-auto max-h-48 font-mono">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const executionId = params.executionId as string;

  const { data: workflow } = useWorkflow(workflowId);
  const { data, isLoading, refetch } = useWorkflowExecutionDetails(
    workflowId,
    executionId,
  );
  const cancelExecution = useCancelExecution();
  const retryExecution = useRetryExecution();

  // WebSocket for real-time updates
  const { isConnected } = useSocket();
  const { status: wsStatus, nodeUpdates } = useWorkflowExecution(executionId);

  // Refetch when execution completes/fails via WebSocket
  useEffect(() => {
    if (
      wsStatus === "completed" ||
      wsStatus === "failed" ||
      wsStatus === "cancelled"
    ) {
      refetch();
    }
  }, [wsStatus, refetch]);

  const handleCancel = async () => {
    try {
      await cancelExecution.mutateAsync({ workflowId, executionId });
      toast.success("Execution cancelled");
    } catch {
      toast.error("Failed to cancel execution");
    }
  };

  const handleRetry = async () => {
    try {
      await retryExecution.mutateAsync({ workflowId, executionId });
      toast.success("Execution retried");
    } catch {
      toast.error("Failed to retry execution");
    }
  };

  const execution = data?.execution;

  // Merge REST data with WebSocket updates for real-time node status
  // This must be called before any conditional returns (Rules of Hooks)
  const nodeResults: NodeExecutionResult[] = useMemo(() => {
    const nodeExecutions = (data?.nodeExecutions || []).filter(
      (ne) => ne.nodeId !== "_log",
    );
    const results: NodeExecutionResult[] = nodeExecutions.map((ne) => ({
      nodeId: ne.nodeId,
      nodeName: ne.nodeName,
      nodeType: ne.nodeType,
      status: ne.status,
      output: ne.output,
      error: ne.error,
      startedAt: ne.startedAt,
      completedAt: ne.completedAt,
      durationMs:
        ne.durationMs ??
        (ne.completedAt && ne.startedAt
          ? new Date(ne.completedAt).getTime() -
            new Date(ne.startedAt).getTime()
          : undefined),
    }));

    // Apply WebSocket updates on top of REST data
    // Merge instead of replace to preserve REST data when available
    nodeUpdates.forEach((update, nodeId) => {
      if (nodeId === "_log") return;
      const existingIdx = results.findIndex((r) => r.nodeId === nodeId);

      if (existingIdx >= 0) {
        // Merge: prefer non-null REST data over WS updates
        const existing = results[existingIdx];
        results[existingIdx] = {
          ...existing,
          // Only update status if WS is "more progressed" or REST is incomplete
          status:
            existing.status === "completed" || existing.status === "failed"
              ? existing.status // REST shows terminal state - keep it
              : (update.status as NodeExecutionResult["status"]),
          // Prefer REST data for timing/output
          startedAt:
            existing.startedAt || update.startedAt || new Date().toISOString(),
          completedAt: existing.completedAt || update.completedAt,
          durationMs: existing.durationMs ?? update.duration,
          output: existing.output || update.output,
          error: existing.error || update.error,
        };
      } else {
        // No REST data - use WS data
        results.push({
          nodeId: update.nodeId,
          status: update.status as NodeExecutionResult["status"],
          output: update.output,
          error: update.error,
          startedAt: update.startedAt || new Date().toISOString(),
          completedAt: update.completedAt,
          durationMs: update.duration,
        });
      }
    });

    // If execution is terminal, force any stuck "running" nodes to resolved state
    const executionStatus = execution?.status;
    if (executionStatus === "completed" || executionStatus === "failed") {
      for (const result of results) {
        if (result.status === "running" || result.status === "pending") {
          result.status = result.error ? "failed" : "completed";
        }
      }
    }

    return results;
  }, [data?.nodeExecutions, nodeUpdates, execution?.status]);

  const definition = execution?.workflow?.definition;
  const nodes = definition?.nodes || [];
  const edges = definition?.edges || [];

  // Sort nodeResults by topological order (execution flow) based on edges
  const sortedNodeResults = useMemo(() => {
    if (!edges.length || !nodeResults.length) return nodeResults;

    // Build adjacency: which nodes come after which
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    const allNodeIds = new Set(nodeResults.map((r) => r.nodeId));

    for (const id of allNodeIds) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    for (const edge of edges) {
      if (allNodeIds.has(edge.source) && allNodeIds.has(edge.target)) {
        adjList.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    // Kahn's algorithm - topological sort
    const queue = [...allNodeIds].filter((id) => (inDegree.get(id) || 0) === 0);
    const sorted: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const neighbor of adjList.get(node) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    // Add any nodes not in edges (orphans)
    for (const id of allNodeIds) {
      if (!sorted.includes(id)) sorted.push(id);
    }

    const orderMap = new Map(sorted.map((id, idx) => [id, idx]));
    return [...nodeResults].sort(
      (a, b) => (orderMap.get(a.nodeId) ?? 999) - (orderMap.get(b.nodeId) ?? 999)
    );
  }, [nodeResults, edges]);

  // Loading state - must be after all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Use WebSocket status if running, otherwise use REST status
  const currentStatus = wsStatus !== "pending" ? wsStatus : execution?.status;
  const executionStatus =
    statusConfig[(currentStatus as ExecutionStatus) || "pending"];

  const nodeMap = new Map(
    nodes.map((n: { id: string; name: string; type: string }) => [n.id, n]),
  );

  const completedCount = sortedNodeResults.filter(
    (n) => n.status === "completed",
  ).length;
  const totalDuration =
    execution?.startedAt && execution?.completedAt
      ? new Date(execution.completedAt).getTime() -
        new Date(execution.startedAt).getTime()
      : undefined;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/workflows/${workflowId}/executions`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {workflow?.name || "Workflow"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {executionId.slice(0, 8)} · {execution?.startedAt
                ? formatDistanceToNow(new Date(execution.startedAt))
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/workflows/${workflowId}/executions/${executionId}/terminal`}>
            <Button variant="outline" size="sm">
              <TerminalIcon className="w-4 h-4 mr-1.5" />
              Terminal
            </Button>
          </Link>
          {currentStatus === "running" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelExecution.isPending}
            >
              <StopCircle className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
          )}
          {currentStatus === "failed" && (
            <Button size="sm" onClick={handleRetry} disabled={retryExecution.isPending}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`gap-1.5 px-3 py-1 ${executionStatus.color}`}
        >
          {executionStatus.icon}
          {executionStatus.label}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{nodes.length} steps
        </span>
        {totalDuration && (
          <span className="text-sm text-muted-foreground">
            · {formatDuration(totalDuration)}
          </span>
        )}
        {currentStatus === "running" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Progress bar */}
      <PipelineProgress
        steps={sortedNodeResults}
        nodes={nodes as Array<{ id: string; name: string; type: string }>}
      />

      {/* Steps */}
      {sortedNodeResults.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p className="text-sm">Waiting for execution to start...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedNodeResults.map((result) => {
            const nodeDef = nodeMap.get(result.nodeId) as
              | { name: string; type: string }
              | undefined;
            return (
              <StepCard
                key={result.nodeId}
                step={result}
                nodeName={nodeDef?.name || result.nodeId}
                nodeType={nodeDef?.type || "unknown"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
