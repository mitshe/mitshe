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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Play,
  Loader2,
  Eye,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useWorkflow,
  useWorkflowExecutions,
  useRunWorkflow,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import { executionStatusConfig, getExecutionStatus } from "@/lib/status-config";

function formatDuration(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const durationMs = end - start;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

export default function WorkflowExecutionsPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const { data: workflow, isLoading: workflowLoading } =
    useWorkflow(workflowId);
  const { data: executions = [], isLoading: executionsLoading } =
    useWorkflowExecutions(workflowId);
  const runWorkflow = useRunWorkflow();

  const handleRunWorkflow = async () => {
    try {
      await runWorkflow.mutateAsync({ id: workflowId });
      toast.success("Workflow started");
    } catch {
      toast.error("Failed to start workflow");
    }
  };

  const isLoading = workflowLoading || executionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(
    (e) => e.status === "completed",
  ).length;
  const failedExecutions = executions.filter(
    (e) => e.status === "failed",
  ).length;
  const runningExecutions = executions.filter(
    (e) => e.status === "running",
  ).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {workflow?.name || "Workflow"}
            </h1>
            <p className="text-muted-foreground">Execution History</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/workflows/${workflowId}/edit`}>
            <Button variant="outline">Edit Workflow</Button>
          </Link>
          <Button
            onClick={handleRunWorkflow}
            disabled={runWorkflow.isPending || !workflow?.isActive}
          >
            {runWorkflow.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>Total</span>
          <span className="font-semibold text-foreground">
            {totalExecutions}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Successful</span>
          <span className="font-semibold text-foreground">
            {successfulExecutions}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-rose-500" />
          <span>Failed</span>
          <span className="font-semibold text-foreground">
            {failedExecutions}
          </span>
        </div>
        {runningExecutions > 0 && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span>Running</span>
            <span className="font-semibold text-foreground">
              {runningExecutions}
            </span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executions</CardTitle>
          <CardDescription>
            All workflow executions sorted by most recent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p className="mb-4">No executions yet</p>
              <Button
                onClick={handleRunWorkflow}
                disabled={!workflow?.isActive}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Workflow
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => {
                  const status = getExecutionStatus(execution.status);
                  return (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(execution.startedAt))}
                      </TableCell>
                      <TableCell>
                        {formatDuration(
                          execution.startedAt,
                          execution.completedAt,
                        )}
                      </TableCell>
                      <TableCell>
                        {execution.error ? (
                          <span className="text-red-600 text-sm truncate max-w-[200px] block">
                            {execution.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link
                            href={`/workflows/${workflowId}/executions/${execution.id}`}
                          >
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {execution.status === "failed" && (
                            <Button variant="ghost" size="icon">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
