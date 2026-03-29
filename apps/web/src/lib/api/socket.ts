"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

interface TaskUpdate {
  taskId: string;
  status: string;
  message?: string;
  agentName?: string;
  progress?: number;
}

interface AgentLog {
  taskId: string;
  agentName: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface TaskCompleted {
  taskId: string;
  result: {
    type: string;
    mergeRequestUrl?: string;
    comment?: string;
  };
}

interface TaskFailed {
  taskId: string;
  reason: string;
}

type EventHandlers = {
  "task:update"?: (data: TaskUpdate) => void;
  "agent:log"?: (data: AgentLog) => void;
  "task:completed"?: (data: TaskCompleted) => void;
  "task:failed"?: (data: TaskFailed) => void;
};

export function useTaskSocket(
  organizationId: string | undefined,
  handlers: EventHandlers,
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!organizationId) return;

    const socket = io(`${WS_URL}/tasks`, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe:organization", organizationId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    if (handlers["task:update"]) {
      socket.on("task:update", handlers["task:update"]);
    }
    if (handlers["agent:log"]) {
      socket.on("agent:log", handlers["agent:log"]);
    }
    if (handlers["task:completed"]) {
      socket.on("task:completed", handlers["task:completed"]);
    }
    if (handlers["task:failed"]) {
      socket.on("task:failed", handlers["task:failed"]);
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [organizationId, handlers]);

  const subscribeToTask = useCallback((taskId: string) => {
    socketRef.current?.emit("subscribe:task", taskId);
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    socketRef.current?.emit("unsubscribe:task", taskId);
  }, []);

  return {
    subscribeToTask,
    unsubscribeFromTask,
    isConnected,
  };
}

export type { TaskUpdate, AgentLog, TaskCompleted, TaskFailed };
