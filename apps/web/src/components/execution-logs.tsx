"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket/socket-context";

interface LogEntry {
  timestamp: string;
  type: "node" | "info" | "error" | "success";
  text: string;
}

/**
 * Terminal-like execution log viewer.
 * Shows real-time workflow events as they happen.
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
  const autoScroll = useRef(true);

  useEffect(() => {
    if (!socket || !executionId) return;

    subscribeToExecution(executionId);

    const addLog = (entry: LogEntry) => {
      setLogs((prev) => [...prev, entry]);
    };

    const nodeHandler = (payload: {
      nodeId: string;
      nodeName?: string;
      status: string;
      error?: string;
      output?: Record<string, unknown>;
    }) => {
      const name = payload.nodeName || payload.nodeId;
      const time = new Date().toLocaleTimeString("en-US", { hour12: false });

      if (payload.status === "running") {
        addLog({
          timestamp: time,
          type: "node",
          text: `\u25B6 ${name}`,
        });
      } else if (payload.status === "completed") {
        const msg = payload.output?.message
          ? ` \u2014 ${payload.output.message}`
          : "";
        addLog({
          timestamp: time,
          type: "success",
          text: `\u2713 ${name}${msg}`,
        });
      } else if (payload.status === "failed") {
        addLog({
          timestamp: time,
          type: "error",
          text: `\u2717 ${name} \u2014 ${payload.error || "Failed"}`,
        });
      }
    };

    const startedHandler = () => {
      addLog({
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type: "info",
        text: "Workflow started",
      });
    };

    const completeHandler = () => {
      addLog({
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type: "success",
        text: "Workflow completed",
      });
    };

    const failHandler = (payload: { error?: string }) => {
      addLog({
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type: "error",
        text: `Workflow failed: ${payload.error || "Unknown error"}`,
      });
    };

    socket.on("workflow:node:update", nodeHandler);
    socket.on("workflow:execution:started", startedHandler);
    socket.on("workflow:execution:completed", completeHandler);
    socket.on("workflow:execution:failed", failHandler);

    return () => {
      socket.off("workflow:node:update", nodeHandler);
      socket.off("workflow:execution:started", startedHandler);
      socket.off("workflow:execution:completed", completeHandler);
      socket.off("workflow:execution:failed", failHandler);
      unsubscribeFromExecution(executionId);
    };
  }, [socket, executionId, subscribeToExecution, unsubscribeFromExecution]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const typeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "node":
        return "text-blue-400";
      case "success":
        return "text-emerald-400";
      case "error":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="rounded-lg border bg-[#0a0a0a] overflow-y-auto font-mono text-[13px] leading-5"
      style={{ height: 280 }}
    >
      <div className="p-3 space-y-0.5">
        {logs.length === 0 && (
          <div className="text-zinc-600">
            {isRunning ? "$ waiting for events..." : "$ no events recorded"}
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-zinc-600 select-none shrink-0">
              {log.timestamp}
            </span>
            <span className={typeColor(log.type)}>{log.text}</span>
          </div>
        ))}
        {isRunning && logs.length > 0 && (
          <div className="text-zinc-600 animate-pulse">$ _</div>
        )}
      </div>
    </div>
  );
}
