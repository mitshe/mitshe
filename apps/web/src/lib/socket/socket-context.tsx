"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { SocketEvent, SocketEventPayloads } from "./types";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToOrganization: (organizationId: string) => void;
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  subscribeToWorkflow: (workflowId: string) => void;
  unsubscribeFromWorkflow: (workflowId: string) => void;
  subscribeToExecution: (executionId: string) => void;
  unsubscribeFromExecution: (executionId: string) => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: (sessionId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// In production: empty string = connect to same host (relative URL)
// In dev: connect to API server directly
const SOCKET_URL =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "" // Production: relative URL, same host via reverse proxy
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(`${SOCKET_URL}/events`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socketInstance;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket] = useState<Socket>(() => getSocket());
  const [isConnected, setIsConnected] = useState(false);
  const { getToken, orgId } = useAuth();

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("[WebSocket] Connected, socket id:", socket.id);
      setIsConnected(true);
    };
    const handleDisconnect = (reason: string) => {
      console.log("[WebSocket] Disconnected, reason:", reason);
      setIsConnected(false);
    };
    const handleError = (error: Error) => {
      console.error("[Socket] Connection error:", error.message);
    };

    // DEBUG: Log ALL incoming events
    const handleAnyEvent = (eventName: string, ...args: unknown[]) => {
      console.log(`[WebSocket] EVENT: ${eventName}`, args);
    };
    socket.onAny(handleAnyEvent);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.offAny(handleAnyEvent);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !orgId) return;

    const connectAndAuth = async () => {
      console.log("[WebSocket] Starting connection for org:", orgId);
      if (!socket.connected) {
        socket.connect();
      }

      const handleConnect = async () => {
        try {
          console.log("[WebSocket] Socket connected, authenticating...");
          const token = await getToken();
          socket.emit("authenticate", { organizationId: orgId, token });
        } catch (error) {
          console.error("[Socket] Failed to get auth token:", error);
        }
      };

      const handleAuthenticated = (data: { organizationId: string }) => {
        console.log("[WebSocket] Authenticated for org:", data.organizationId);
      };

      const handleAuthError = (data: { message: string }) => {
        console.error("[WebSocket] Authentication error:", data.message);
      };

      socket.on("connect", handleConnect);
      socket.on("authenticated", handleAuthenticated);
      socket.on("error", handleAuthError);

      if (socket.connected) {
        try {
          console.log("[WebSocket] Already connected, authenticating...");
          const token = await getToken();
          socket.emit("authenticate", { organizationId: orgId, token });
        } catch (error) {
          console.error("[Socket] Failed to get auth token:", error);
        }
      }

      return () => {
        socket.off("connect", handleConnect);
        socket.off("authenticated", handleAuthenticated);
        socket.off("error", handleAuthError);
      };
    };

    connectAndAuth();
  }, [socket, orgId, getToken]);

  const subscribeToOrganization = useCallback(
    (organizationId: string) => {
      socket?.emit("subscribe:organization", organizationId);
    },
    [socket],
  );

  const subscribeToTask = useCallback(
    (taskId: string) => {
      socket?.emit("subscribe:task", taskId);
    },
    [socket],
  );

  const unsubscribeFromTask = useCallback(
    (taskId: string) => {
      socket?.emit("unsubscribe:task", taskId);
    },
    [socket],
  );

  const subscribeToWorkflow = useCallback(
    (workflowId: string) => {
      socket?.emit("subscribe:workflow", workflowId);
    },
    [socket],
  );

  const unsubscribeFromWorkflow = useCallback(
    (workflowId: string) => {
      socket?.emit("unsubscribe:workflow", workflowId);
    },
    [socket],
  );

  const subscribeToExecution = useCallback(
    (executionId: string) => {
      socket?.emit("subscribe:execution", executionId);
    },
    [socket],
  );

  const unsubscribeFromExecution = useCallback(
    (executionId: string) => {
      socket?.emit("unsubscribe:execution", executionId);
    },
    [socket],
  );

  const subscribeToSession = useCallback(
    (sessionId: string) => {
      socket?.emit("subscribe:session", sessionId);
    },
    [socket],
  );

  const unsubscribeFromSession = useCallback(
    (sessionId: string) => {
      socket?.emit("unsubscribe:session", sessionId);
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        subscribeToOrganization,
        subscribeToTask,
        unsubscribeFromTask,
        subscribeToWorkflow,
        unsubscribeFromWorkflow,
        subscribeToExecution,
        unsubscribeFromExecution,
        subscribeToSession,
        unsubscribeFromSession,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

export function useSocketEvent<E extends SocketEvent>(
  event: E,
  callback: (payload: SocketEventPayloads[E]) => void,
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on(event, callback as any);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off(event, callback as any);
    };
  }, [socket, event, callback]);
}

export function useWorkflowExecution(executionId: string | null) {
  const { socket, subscribeToExecution, unsubscribeFromExecution } =
    useSocket();
  const [status, setStatus] = useState<string>("pending");
  const [nodeUpdates, setNodeUpdates] = useState<
    Map<string, SocketEventPayloads["workflow:node:update"]>
  >(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !executionId) return;

    console.log("[WebSocket] Subscribing to execution:", executionId);
    subscribeToExecution(executionId);

    const handleNodeUpdate = (
      payload: SocketEventPayloads["workflow:node:update"],
    ) => {
      console.log("[WebSocket] Received node update:", payload);
      if (payload.executionId === executionId) {
        console.log(
          "[WebSocket] Updating node state:",
          payload.nodeId,
          payload.status,
        );
        setNodeUpdates((prev) => new Map(prev).set(payload.nodeId, payload));
      }
    };

    const handleExecutionStarted = (
      payload: SocketEventPayloads["workflow:execution:started"],
    ) => {
      console.log("[WebSocket] Received execution:started:", payload);
      if (payload.executionId === executionId) {
        setStatus("running");
      }
    };

    const handleExecutionCompleted = (
      payload: SocketEventPayloads["workflow:execution:completed"],
    ) => {
      console.log("[WebSocket] Received execution:completed:", payload);
      if (payload.executionId === executionId) {
        setStatus("completed");
      }
    };

    const handleExecutionFailed = (
      payload: SocketEventPayloads["workflow:execution:failed"],
    ) => {
      console.log("[WebSocket] Received execution:failed:", payload);
      if (payload.executionId === executionId) {
        setStatus("failed");
        setError(payload.error || "Unknown error");
      }
    };

    const handleExecutionCancelled = (
      payload: SocketEventPayloads["workflow:execution:cancelled"],
    ) => {
      if (payload.executionId === executionId) {
        setStatus("cancelled");
      }
    };

    socket.on("workflow:node:update", handleNodeUpdate);
    socket.on("workflow:execution:started", handleExecutionStarted);
    socket.on("workflow:execution:completed", handleExecutionCompleted);
    socket.on("workflow:execution:failed", handleExecutionFailed);
    socket.on("workflow:execution:cancelled", handleExecutionCancelled);

    return () => {
      unsubscribeFromExecution(executionId);
      socket.off("workflow:node:update", handleNodeUpdate);
      socket.off("workflow:execution:started", handleExecutionStarted);
      socket.off("workflow:execution:completed", handleExecutionCompleted);
      socket.off("workflow:execution:failed", handleExecutionFailed);
      socket.off("workflow:execution:cancelled", handleExecutionCancelled);
    };
  }, [socket, executionId, subscribeToExecution, unsubscribeFromExecution]);

  return { status, nodeUpdates, error };
}

export function useTaskUpdates(taskId: string | null) {
  const { socket, subscribeToTask, unsubscribeFromTask } = useSocket();
  const [taskUpdate, setTaskUpdate] = useState<
    SocketEventPayloads["task:update"] | null
  >(null);
  const [agentLogs, setAgentLogs] = useState<
    SocketEventPayloads["agent:log"][]
  >([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !taskId) return;

    subscribeToTask(taskId);

    const handleUpdate = (payload: SocketEventPayloads["task:update"]) => {
      if (payload.taskId === taskId) {
        setTaskUpdate(payload);
      }
    };

    const handleLog = (payload: SocketEventPayloads["agent:log"]) => {
      if (payload.taskId === taskId) {
        setAgentLogs((prev) => [...prev, payload]);
      }
    };

    const handleCompleted = (
      payload: SocketEventPayloads["task:completed"],
    ) => {
      if (payload.taskId === taskId) {
        setIsCompleted(true);
        setResult(payload.result);
      }
    };

    const handleFailed = (payload: SocketEventPayloads["task:failed"]) => {
      if (payload.taskId === taskId) {
        setIsFailed(true);
        setFailReason(payload.reason);
      }
    };

    socket.on("task:update", handleUpdate);
    socket.on("agent:log", handleLog);
    socket.on("task:completed", handleCompleted);
    socket.on("task:failed", handleFailed);

    return () => {
      unsubscribeFromTask(taskId);
      socket.off("task:update", handleUpdate);
      socket.off("agent:log", handleLog);
      socket.off("task:completed", handleCompleted);
      socket.off("task:failed", handleFailed);
    };
  }, [socket, taskId, subscribeToTask, unsubscribeFromTask]);

  return { taskUpdate, agentLogs, isCompleted, isFailed, result, failReason };
}

export function useNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<
    SocketEventPayloads["notification"][]
  >([]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (
      payload: SocketEventPayloads["notification"],
    ) => {
      setNotifications((prev) => [payload, ...prev].slice(0, 50)); // Keep last 50
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, clearNotifications, removeNotification };
}

