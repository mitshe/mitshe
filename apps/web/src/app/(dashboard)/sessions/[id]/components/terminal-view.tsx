"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/socket-context";
import { useStartTerminal } from "@/lib/api/hooks";

export function TerminalView({
  sessionId,
  terminalId,
  isRunning,
  cmd,
}: {
  sessionId: string;
  terminalId: string;
  isRunning: boolean;
  cmd?: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xtermRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitRef = useRef<any>(null);
  const { socket, subscribeToSession, unsubscribeFromSession } = useSocket();
  const startTerminal = useStartTerminal();
  const [terminalReady, setTerminalReady] = useState(false);

  // Initialize xterm
  useEffect(() => {
    if (!termRef.current || !containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let terminal: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fitAddon: any;
    let disposed = false;

    const init = async () => {
      await new Promise<void>((resolve) => {
        const check = () => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect && rect.height > 50 && rect.width > 50) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });

      if (disposed) return;

      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // @ts-expect-error CSS import
      await import("@xterm/xterm/css/xterm.css");

      if (disposed) return;

      terminal = new Terminal({
        cursorBlink: true,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: "#0a0a0a",
          foreground: "#e4e4e7",
          cursor: "#e4e4e7",
          selectionBackground: "#3f3f46",
          black: "#18181b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#e4e4e7",
          brightBlack: "#52525b",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#fafafa",
        },
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(termRef.current!);

      requestAnimationFrame(() => {
        if (!disposed) {
          try {
            fitAddon.fit();
          } catch {
            /* ignore */
          }
        }
      });

      xtermRef.current = terminal;
      fitRef.current = fitAddon;
      setTerminalReady(true);
    };

    init();

    return () => {
      disposed = true;
      terminal?.dispose();
      xtermRef.current = null;
      fitRef.current = null;
      setTerminalReady(false);
    };
  }, []);

  // Resize handling
  useEffect(() => {
    if (!fitRef.current || !containerRef.current) return;

    const handleResize = () => {
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [terminalReady]);

  // Subscribe to terminal output
  useEffect(() => {
    if (!socket || !sessionId || !terminalReady) return;

    subscribeToSession(sessionId);

    const handleOutput = (payload: {
      terminalId: string;
      data: string;
    }) => {
      if (payload.terminalId === terminalId && xtermRef.current) {
        xtermRef.current.write(payload.data);
      }
    };

    socket.on("session:output", handleOutput);

    return () => {
      socket.off("session:output", handleOutput);
    };
  }, [
    socket,
    sessionId,
    terminalId,
    terminalReady,
    subscribeToSession,
    unsubscribeFromSession,
  ]);

  // Forward keyboard input via WebSocket
  useEffect(() => {
    if (!xtermRef.current || !socket || !isRunning) return;

    const disposable = xtermRef.current.onData((data: string) => {
      socket.emit("session:input", { terminalId, input: data });
    });

    return () => disposable.dispose();
  }, [terminalReady, socket, terminalId, isRunning]);

  // Start terminal process
  useEffect(() => {
    if (!terminalReady || !isRunning) return;

    startTerminal
      .mutateAsync({ sessionId, terminalId, cmd })
      .then((res) => {
        if (res.buffer && xtermRef.current) {
          xtermRef.current.write(res.buffer);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [terminalReady, isRunning, sessionId, terminalId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <div ref={termRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
