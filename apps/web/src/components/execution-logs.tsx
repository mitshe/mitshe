"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSocket } from "@/lib/socket/socket-context";
import type { NodeExecutionResult } from "@/lib/api/types";

interface LogEntry {
  timestamp: string;
  type: "node" | "info" | "error" | "success" | "cmd";
  text: string;
}

/**
 * Terminal-like execution log viewer.
 * Builds initial logs from DB data, then appends live WebSocket events.
 */
export function ExecutionLogs({
  executionId,
  nodeExecutions,
  isRunning,
  fullHeight = false,
  savedLogs = [],
}: {
  executionId: string;
  nodeExecutions: NodeExecutionResult[];
  isRunning: boolean;
  fullHeight?: boolean;
  savedLogs?: Array<{ timestamp: string; message: string }>;
}) {
  const { socket, subscribeToExecution, unsubscribeFromExecution } = useSocket();
  const [liveEntries, setLiveEntries] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  const seenNodeIdsRef = useRef(new Set<string>());

  // Build saved logs entries
  const savedLogEntries: LogEntry[] = useMemo(() => {
    return savedLogs.map((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false });
      const isCmd = log.message.startsWith("$");
      const isError = log.message.startsWith("\u2717") || log.message.toLowerCase().includes("failed");
      const isSuccess = log.message.startsWith("\u2713");
      return {
        timestamp: time,
        type: isCmd ? "cmd" as const : isError ? "error" as const : isSuccess ? "success" as const : "info" as const,
        text: log.message,
      };
    });
  }, [savedLogs]);

  // Build logs from node executions (fallback when no saved logs)
  const dbLogs = useMemo(() => {
    const entries: LogEntry[] = [];
    const seen = new Set<string>();

    const sorted = [...nodeExecutions].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    for (const node of sorted) {
      const name = node.nodeName || node.nodeId;
      const time = node.startedAt
        ? new Date(node.startedAt).toLocaleTimeString("en-US", {
            hour12: false,
          })
        : "";

      seen.add(`${node.nodeId}:${node.status}`);

      if (node.status === "completed") {
        const msg = (node.output as Record<string, string>)?.message;
        entries.push({
          timestamp: time,
          type: "success",
          text: `\u2713 ${name}${msg ? ` \u2014 ${msg}` : ""}`,
        });
      } else if (node.status === "failed") {
        entries.push({
          timestamp: time,
          type: "error",
          text: `\u2717 ${name} \u2014 ${node.error || "Failed"}`,
        });
      } else if (node.status === "running") {
        entries.push({
          timestamp: time,
          type: "node",
          text: `\u25B6 ${name}`,
        });
      }
    }

    return { entries, seen };
  }, [nodeExecutions]);

  // Sync seen IDs to ref (for WebSocket dedup)
  useEffect(() => {
    seenNodeIdsRef.current = dbLogs.seen;
  }, [dbLogs.seen]);

  // Subscribe to live WebSocket events
  useEffect(() => {
    if (!socket || !executionId) return;

    subscribeToExecution(executionId);

    const addLive = (entry: LogEntry) => {
      setLiveEntries((prev) => [...prev, entry]);
    };

    // Listen to dedicated log event — same format as saved logs in DB
    const logHandler = (payload: { message: string }) => {
      const time = new Date().toLocaleTimeString("en-US", { hour12: false });
      const msg = payload.message;
      const isCmd = msg.startsWith("$");
      const isError = msg.startsWith("\u2717");
      const isSuccess = msg.startsWith("\u2713");
      addLive({
        timestamp: time,
        type: isCmd ? "cmd" : isError ? "error" : isSuccess ? "success" : msg.startsWith("\u25B6") ? "node" : "info",
        text: msg,
      });
    };

    socket.on("workflow:execution:log", logHandler);

    return () => {
      socket.off("workflow:execution:log", logHandler);
      unsubscribeFromExecution(executionId);
    };
  }, [socket, executionId, subscribeToExecution, unsubscribeFromExecution]);

  const hasSavedLogs = savedLogEntries.length > 0;
  const baseLogs = hasSavedLogs ? savedLogEntries : dbLogs.entries;
  const allLogs = hasSavedLogs ? baseLogs : [...baseLogs, ...liveEntries];

  // Auto-scroll
  useEffect(() => {
    if (autoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allLogs.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const typeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "cmd":
        return "text-yellow-300 font-semibold";
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
      className={`bg-[#0a0a0a] overflow-y-auto font-mono text-[13px] leading-5 ${fullHeight ? "" : "rounded-lg border"}`}
      style={fullHeight ? { height: "100%" } : { height: 300 }}
    >
      <div className="p-3 space-y-0.5">
        {allLogs.length === 0 && (
          <div className="text-zinc-600">
            {isRunning ? "$ waiting for events..." : "$ no events recorded"}
          </div>
        )}
        {allLogs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-zinc-600 select-none shrink-0">
              {log.timestamp}
            </span>
            <span className={typeColor(log.type)}>{log.text}</span>
          </div>
        ))}
        {isRunning && allLogs.length > 0 && (
          <div className="text-zinc-600 animate-pulse">$ _</div>
        )}
      </div>
    </div>
  );
}
