"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TerminalStream } from "@/components/terminal-stream";
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
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              running > 0
                ? "bg-blue-500"
                : failed > 0
                  ? "bg-zinc-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {completed + failed}/{total} steps
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {nodes.map((node, idx) => {
          const step = steps.find((s) => s.nodeId === node.id);
          const status = step?.status || "pending";

          return (
            <div
              key={node.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                status === "running"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                  : status === "completed"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : status === "failed"
                      ? "bg-zinc-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{idx + 1}</span>
              {status === "running" && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              {status === "completed" && <CheckCircle2 className="w-3 h-3" />}
              {status === "failed" && <XCircle className="w-3 h-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({
  step,
  nodeName,
  nodeType,
  isLast,
  stepNumber,
}: {
  step: NodeExecutionResult;
  nodeName: string;
  nodeType: string;
  isLast: boolean;
  stepNumber: number;
}) {
  const [isOpen, setIsOpen] = useState(step.status === "failed");
  const status = statusConfig[step.status] || statusConfig.pending;
  const icon = nodeTypeIcons[nodeType] || <Zap className="w-4 h-4" />;

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-5 top-12 w-px h-full -ml-px bg-border" />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full mt-4 flex items-center justify-center text-white z-10 font-semibold text-sm transition-all ${status.bgColor} ${
              step.status === "running" ? "shadow-md shadow-blue-500/30" : ""
            } ${step.status === "failed" ? "text-rose-400" : ""}`}
          >
            {step.status === "running" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : step.status === "failed" ? (
              <XCircle className="w-5 h-5" />
            ) : (
              stepNumber
            )}
          </div>

          <div className="flex-1 pb-6">
            <CollapsibleTrigger className="w-full text-left">
              <div
                className={`flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent/30 transition-all cursor-pointer ${
                  step.status === "running"
                    ? "border-blue-500/30 shadow-sm"
                    : step.status === "failed"
                      ? "border-border"
                      : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      step.status === "running"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : step.status === "failed"
                          ? "bg-zinc-100 dark:bg-zinc-800 text-rose-500 dark:text-rose-400"
                          : step.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{nodeName}</p>
                    <p className="text-xs text-muted-foreground">{nodeType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {step.durationMs && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDuration(step.durationMs)}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={`text-xs font-medium ${status.color}`}
                  >
                    {status.label}
                  </Badge>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-2 p-4 bg-muted/20 border rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Started
                    </p>
                    <p className="font-mono text-xs">
                      {step.startedAt
                        ? new Date(step.startedAt).toLocaleTimeString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Completed
                    </p>
                    <p className="font-mono text-xs">
                      {step.completedAt
                        ? new Date(step.completedAt).toLocaleTimeString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Duration
                    </p>
                    <p className="font-mono text-xs">
                      {formatDuration(step.durationMs ?? undefined)}
                    </p>
                  </div>
                </div>

                {step.error && (
                  <div>
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error Details
                    </p>
                    <pre className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono">
                      {step.error}
                    </pre>
                  </div>
                )}

                {step.output && Object.keys(step.output).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Output
                    </p>
                    <pre className="p-3 bg-muted/50 border rounded-lg text-xs overflow-x-auto max-h-48 font-mono">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
    </div>
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
    const nodeExecutions = data?.nodeExecutions || [];
    // Start with the REST data, ensuring it has the correct structure
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workflows/${workflowId}/executions`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {workflow?.name || "Workflow"}
              </h1>
              <Badge
                variant="outline"
                className={`gap-1 ${executionStatus.color}`}
              >
                {executionStatus.icon}
                {executionStatus.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Execution {executionId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* WebSocket connection indicator */}
          <div className="flex items-center gap-2 text-xs">
            <Radio
              className={`w-3 h-3 ${
                isConnected ? "text-emerald-500 animate-pulse" : "text-zinc-400"
              }`}
            />
            <span className="text-muted-foreground">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex gap-2">
            {currentStatus === "running" && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelExecution.isPending}
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            {currentStatus === "failed" && (
              <Button onClick={handleRetry} disabled={retryExecution.isPending}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Subtle execution summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            Started{" "}
            {execution?.startedAt
              ? formatDistanceToNow(new Date(execution.startedAt))
              : "-"}
          </span>
        </div>
        {execution?.completedAt && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Completed {formatDistanceToNow(new Date(execution.completedAt))}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">
            {sortedNodeResults.filter((n) => n.status === "completed").length}
          </span>
          <span>of {nodes.length} steps completed</span>
        </div>
      </div>

      {execution?.error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Execution Error
          </p>
          <pre className="text-sm text-rose-700 dark:text-rose-300 overflow-x-auto font-mono">
            {execution.error}
          </pre>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Execution</CardTitle>
          <CardDescription>Step-by-step execution progress</CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineProgress
            steps={sortedNodeResults}
            nodes={nodes as Array<{ id: string; name: string; type: string }>}
          />

          {sortedNodeResults.length === 0 && nodes.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p>Waiting for execution to start...</p>
            </div>
          ) : sortedNodeResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p>No steps defined</p>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedNodeResults.map((result, index) => {
                const nodeDef = nodeMap.get(result.nodeId) as
                  | { name: string; type: string }
                  | undefined;
                return (
                  <StepCard
                    key={result.nodeId}
                    step={result}
                    nodeName={nodeDef?.name || result.nodeId}
                    nodeType={nodeDef?.type || "unknown"}
                    isLast={index === sortedNodeResults.length - 1}
                    stepNumber={index + 1}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live session terminal — shown when any step created a session */}
      {(() => {
        const sessionId = sortedNodeResults.find(
          (r) => r.output?.sessionId,
        )?.output?.sessionId as string | undefined;
        if (!sessionId) return null;
        const isRunning = currentStatus === "running";
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4" />
                Session Terminal
                {isRunning && (
                  <Badge variant="outline" className="text-emerald-500 gap-1 ml-2">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isRunning
                  ? "Watch Claude Code working in real-time"
                  : "Terminal output from the session"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TerminalStream sessionId={sessionId} />
            </CardContent>
          </Card>
        );
      })()}

      {execution?.input && (
        <Card>
          <CardHeader>
            <CardTitle>Trigger Data</CardTitle>
            <CardDescription>
              Input data that triggered this execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-3 bg-muted border rounded text-sm overflow-x-auto max-h-64">
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
