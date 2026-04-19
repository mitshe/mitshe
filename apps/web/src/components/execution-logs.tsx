"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket/socket-context";
import { Terminal, ScrollText } from "lucide-react";

interface LogEntry {
  timestamp: string;
  nodeId?: string;
  nodeName?: string;
  status?: string;
  message?: string;
}

/**
 * Live execution log viewer — shows real-time node events from workflow execution.
 * Subscribes to workflow WebSocket events and displays them as a scrolling log.
 */
export function ExecutionLogs({
  executionId,
  isRunning,
}: {
  executionId: string;
  isRunning: boolean;
}) {
  const { socket, subscribeToExecution, unsubscribeFromExecution } = useSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !executionId) return;

    subscribeToExecution(executionId);

    const nodeHandler = (payload: {
      nodeId: string;
      nodeName?: string;
      status: string;
      error?: string;
      output?: Record<string, unknown>;
    }) => {
      const entry: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        nodeId: payload.nodeId,
        nodeName: payload.nodeName,
        status: payload.status,
        message:
          payload.status === "failed"
            ? `Failed: ${payload.error || "Unknown error"}`
            : payload.status === "completed"
              ? payload.output?.message
                ? String(payload.output.message)
                : "Completed"
              : payload.status === "running"
                ? "Started..."
                : payload.status,
      };
      setLogs((prev) => [...prev, entry]);
    };

    const completeHandler = () => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: "Workflow completed",
        },
      ]);
    };

    const failHandler = (payload: { error?: string }) => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `Workflow failed: ${payload.error || "Unknown error"}`,
        },
      ]);
    };

    socket.on("workflow:node:update", nodeHandler);
    socket.on("workflow:execution:completed", completeHandler);
    socket.on("workflow:execution:failed", failHandler);

    return () => {
      socket.off("workflow:node:update", nodeHandler);
      socket.off("workflow:execution:completed", completeHandler);
      socket.off("workflow:execution:failed", failHandler);
      unsubscribeFromExecution(executionId);
    };
  }, [socket, executionId, subscribeToExecution, unsubscribeFromExecution]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs.length]);

  const statusColor = (status?: string) => {
    switch (status) {
      case "running":
        return "text-blue-400";
      case "completed":
        return "text-emerald-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" />
          Live Logs
        </p>
        {isRunning && (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Streaming
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="rounded-lg border bg-[#0a0a0a] p-3 overflow-y-auto font-mono text-xs"
        style={{ height: 250 }}
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground">
            {isRunning ? "Waiting for events..." : "No log events recorded"}
          </p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-muted-foreground/60 shrink-0">
                {log.timestamp}
              </span>
              {log.nodeName && (
                <span className={`shrink-0 ${statusColor(log.status)}`}>
                  [{log.nodeName}]
                </span>
              )}
              <span className="text-zinc-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
