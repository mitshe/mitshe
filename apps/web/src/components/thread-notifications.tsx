"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/socket-context";
import { useSessions } from "@/lib/api/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Global listener for thread status changes.
 * Shows toast when a thread completes or fails (even if user is on another page).
 */
export function ThreadNotifications() {
  const { socket } = useSocket();
  const router = useRouter();
  const { data: sessions = [] } = useSessions();
  const sessionNamesRef = useRef<Map<string, string>>(new Map());

  // Keep session names in sync for toast messages
  useEffect(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      map.set(s.id, s.name);
    }
    sessionNamesRef.current = map;
  }, [sessions]);

  useEffect(() => {
    if (!socket) return;

    const handleStatus = (payload: { sessionId: string; status: string; error?: string }) => {
      const name = sessionNamesRef.current.get(payload.sessionId) || "Thread";

      if (payload.status === "RUNNING") {
        toast.success(`${name} is running`, {
          action: {
            label: "Open",
            onClick: () => router.push(`/sessions/${payload.sessionId}`),
          },
        });
      }

      if (payload.status === "COMPLETED") {
        toast.info(`${name} stopped`, {
          action: {
            label: "Open",
            onClick: () => router.push(`/sessions/${payload.sessionId}`),
          },
        });
      }

      if (payload.status === "FAILED") {
        toast.error(`${name} failed${payload.error ? `: ${payload.error}` : ""}`, {
          action: {
            label: "Open",
            onClick: () => router.push(`/sessions/${payload.sessionId}`),
          },
        });
      }
    };

    socket.on("session:status", handleStatus);
    return () => { socket.off("session:status", handleStatus); };
  }, [socket, router]);

  return null;
}
