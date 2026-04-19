"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/socket-context";
import { Terminal as TerminalIcon } from "lucide-react";

/**
 * Read-only terminal stream — shows live output from a running session.
 * Used in workflow execution detail to show what Claude Code is doing.
 * Does NOT start a new terminal — only subscribes to existing output.
 */
export function TerminalStream({
  sessionId,
  isVisible = true,
}: {
  sessionId: string;
  isVisible?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xtermRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitRef = useRef<any>(null);
  const { socket, subscribeToSession, unsubscribeFromSession } = useSocket();
  const [ready, setReady] = useState(false);

  // Initialize xterm
  useEffect(() => {
    if (!termRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;

    let mounted = true;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // @ts-expect-error — CSS module import
      await import("@xterm/xterm/css/xterm.css");

      if (!mounted || !termRef.current) return;

      const term = new Terminal({
        cursorBlink: false,
        disableStdin: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        theme: {
          background: "#0a0a0a",
          foreground: "#e4e4e7",
          cursor: "#a1a1aa",
        },
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();

      xtermRef.current = term;
      fitRef.current = fit;
      setReady(true);
    })();

    return () => {
      mounted = false;
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Subscribe to session output
  useEffect(() => {
    if (!socket || !ready || !sessionId) return;

    subscribeToSession(sessionId);

    const handler = (payload: { terminalId: string; data: string }) => {
      xtermRef.current?.write(payload.data);
    };

    socket.on("session:output", handler);

    return () => {
      socket.off("session:output", handler);
      unsubscribeFromSession(sessionId);
    };
  }, [socket, ready, sessionId, subscribeToSession, unsubscribeFromSession]);

  // Refit on visibility change
  useEffect(() => {
    if (isVisible && fitRef.current) {
      setTimeout(() => fitRef.current?.fit(), 100);
    }
  }, [isVisible]);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current || !fitRef.current) return;
    const observer = new ResizeObserver(() => {
      fitRef.current?.fit();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <TerminalIcon className="w-3.5 h-3.5" />
        Live Session Terminal
      </p>
      <div
        ref={containerRef}
        className="rounded-lg border bg-[#0a0a0a] overflow-hidden"
        style={{ height: 300 }}
      >
        <div ref={termRef} className="h-full" />
      </div>
    </div>
  );
}
