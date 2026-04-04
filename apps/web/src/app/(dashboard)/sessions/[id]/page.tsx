"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Pause,
  Play,
  Square,
  ArrowLeft,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Radio,
  Terminal as TerminalIcon,
} from "lucide-react";
import {
  useSession,
  useStartTerminal,
  useSendInput,
  usePauseSession,
  useResumeSession,
  useStopSession,
  useSessionFiles,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import type { SessionStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// ─── File Tree ──────────────────────────────────────────────────────

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

function buildFileTree(paths: string[], basePath: string): FileTreeNode[] {
  const root: Record<string, any> = {};

  for (const filePath of paths) {
    const relative = filePath.startsWith(basePath)
      ? filePath.slice(basePath.length + 1)
      : filePath;
    const parts = relative.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isFile ? "file" : "directory",
          _children: isFile ? null : {},
        };
      }
      if (!isFile) current = current[part]._children;
    }
  }

  function toArray(obj: Record<string, any>): FileTreeNode[] {
    return Object.values(obj)
      .map((n) => ({
        name: n.name,
        path: n.path,
        type: n.type as "file" | "directory",
        children: n._children ? toArray(n._children) : undefined,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toArray(root);
}

function FileTreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-2 text-xs font-medium hover:bg-muted/50 rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        {isOpen ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-500" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && node.children?.map((child) => <FileTreeItem key={child.path} node={child} depth={depth + 1} />)}
    </div>
  );
}

// ─── XTerm Terminal Component ───────────────────────────────────────

function TerminalView({
  sessionId,
  isRunning,
}: {
  sessionId: string;
  isRunning: boolean;
}) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const { socket, subscribeToSession, unsubscribeFromSession } = useSocket();
  const startTerminal = useStartTerminal();
  const [terminalReady, setTerminalReady] = useState(false);

  // Initialize xterm
  useEffect(() => {
    if (!termRef.current) return;

    let terminal: any;
    let fitAddon: any;

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // @ts-expect-error CSS import for xterm styles
      await import("@xterm/xterm/css/xterm.css");

      terminal = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
      fitAddon.fit();

      xtermRef.current = terminal;
      fitRef.current = fitAddon;
      setTerminalReady(true);

      terminal.writeln("\x1b[1;36m● mitshe session terminal\x1b[0m");
      terminal.writeln("");
    };

    init();

    return () => {
      terminal?.dispose();
      xtermRef.current = null;
      fitRef.current = null;
      setTerminalReady(false);
    };
  }, []);

  // Resize handling
  useEffect(() => {
    if (!fitRef.current) return;

    const handleResize = () => fitRef.current?.fit();
    window.addEventListener("resize", handleResize);

    // Also fit after a short delay (layout might not be stable yet)
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [terminalReady]);

  // Subscribe to session output via WebSocket
  useEffect(() => {
    if (!socket || !sessionId || !terminalReady) return;

    subscribeToSession(sessionId);

    const handleOutput = (payload: { sessionId: string; data: string }) => {
      if (payload.sessionId === sessionId && xtermRef.current) {
        xtermRef.current.write(payload.data);
      }
    };

    const handleStatus = (payload: { sessionId: string; status: string }) => {
      if (payload.sessionId === sessionId && xtermRef.current) {
        if (payload.status === "RUNNING") {
          xtermRef.current.writeln("\x1b[1;32m● Session is running\x1b[0m");
        } else if (payload.status === "PAUSED") {
          xtermRef.current.writeln("\x1b[1;33m● Session paused\x1b[0m");
        } else if (payload.status === "COMPLETED") {
          xtermRef.current.writeln("\x1b[1;36m● Session completed\x1b[0m");
        } else if (payload.status === "FAILED") {
          xtermRef.current.writeln(`\x1b[1;31m● Session failed\x1b[0m`);
        }
      }
    };

    socket.on("session:output", handleOutput);
    socket.on("session:status", handleStatus);

    return () => {
      unsubscribeFromSession(sessionId);
      socket.off("session:output", handleOutput);
      socket.off("session:status", handleStatus);
    };
  }, [socket, sessionId, terminalReady, subscribeToSession, unsubscribeFromSession]);

  // Forward keyboard input to backend via REST
  const sendInput = useSendInput();
  useEffect(() => {
    if (!xtermRef.current || !isRunning) return;

    const disposable = xtermRef.current.onData((data: string) => {
      sendInput.mutate({ id: sessionId, input: data });
    });

    return () => disposable.dispose();
  }, [terminalReady, sessionId, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start terminal session when ready and running
  useEffect(() => {
    if (!terminalReady || !isRunning) return;

    startTerminal.mutateAsync(sessionId).then((res) => {
      if (res.status === "started") {
        xtermRef.current?.writeln("\x1b[1;32m● Claude Code starting...\x1b[0m\r\n");
      }
    }).catch(() => {
      // May already be active - that's fine
    });
  }, [terminalReady, isRunning, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={termRef} className="w-full h-full" />
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { data: files = [] } = useSessionFiles(sessionId);
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();

  const { socket } = useSocket();

  // Listen for status changes
  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleStatus = (payload: { sessionId: string; status: string }) => {
      if (payload.sessionId === sessionId) {
        refetch();
      }
    };

    socket.on("session:status", handleStatus);
    return () => { socket.off("session:status", handleStatus); };
  }, [socket, sessionId, refetch]);

  const handlePause = async () => {
    try { await pauseSession.mutateAsync(sessionId); refetch(); }
    catch { toast.error("Failed to pause session"); }
  };

  const handleResume = async () => {
    try { await resumeSession.mutateAsync(sessionId); refetch(); }
    catch { toast.error("Failed to resume session"); }
  };

  const handleStop = async () => {
    try { await stopSession.mutateAsync(sessionId); refetch(); }
    catch { toast.error("Failed to stop session"); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const currentStatus = session.status as SessionStatus;
  const isRunning = currentStatus === "RUNNING";
  const isPaused = currentStatus === "PAUSED";
  const isActive = isRunning || isPaused;
  const fileTree = buildFileTree(files, "/workspace");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/sessions")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              <h1 className="font-semibold text-sm">{session.name}</h1>
              <Badge
                variant={isRunning ? "default" : isPaused ? "secondary" : currentStatus === "FAILED" ? "destructive" : "outline"}
                className="gap-1"
              >
                {isRunning && <Radio className="w-3 h-3 animate-pulse" />}
                {currentStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {session.project?.name || "No project"}
              {session.aiCredential && ` · ${session.aiCredential.provider}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
          {isPaused && (
            <Button variant="outline" size="sm" onClick={handleResume}>
              <Play className="w-4 h-4 mr-1" /> Resume
            </Button>
          )}
          {isActive && (
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="w-4 h-4 mr-1" /> Stop
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File Browser */}
        <div className="w-60 border-r shrink-0 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {fileTree.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {isActive ? "Loading files..." : "No files"}
                </p>
              ) : (
                fileTree.map((node) => <FileTreeItem key={node.path} node={node} />)
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Terminal */}
        <div className="flex-1 min-w-0 bg-[#0a0a0a] p-1">
          {isActive ? (
            <TerminalView sessionId={sessionId} isRunning={isRunning} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Session is {currentStatus.toLowerCase()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
