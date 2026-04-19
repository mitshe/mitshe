"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import { useWorkflowExecutionDetails } from "@/lib/api/hooks";
import { useWorkflowExecution, useSocket } from "@/lib/socket/socket-context";
import { ExecutionLogs } from "@/components/execution-logs";

export default function ExecutionTerminalPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const executionId = params.executionId as string;

  const { data, isLoading } = useWorkflowExecutionDetails(
    workflowId,
    executionId,
  );
  const { isConnected } = useSocket();
  const { status: wsStatus } = useWorkflowExecution(executionId);

  const execution = data?.execution;
  const currentStatus = wsStatus !== "pending" ? wsStatus : execution?.status;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/workflows/${workflowId}/executions/${executionId}`}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="font-medium text-sm">
            Execution Terminal
          </span>
          {currentStatus === "running" && (
            <Badge
              variant="outline"
              className="text-emerald-500 gap-1"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              Live
            </Badge>
          )}
          {currentStatus === "completed" && (
            <Badge variant="outline" className="text-emerald-500">
              Completed
            </Badge>
          )}
          {currentStatus === "failed" && (
            <Badge variant="outline" className="text-red-500">
              Failed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-zinc-400"}`}
          />
          {isConnected ? "Connected" : "Offline"}
        </div>
      </div>

      {/* Full-height terminal */}
      <div className="flex-1 overflow-hidden p-0">
        <ExecutionLogs
          executionId={executionId}
          nodeExecutions={data?.nodeExecutions || []}
          isRunning={currentStatus === "running"}
          fullHeight
        />
      </div>
    </div>
  );
}
