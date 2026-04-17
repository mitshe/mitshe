"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Pause,
  Play,
  Square,
  ArrowLeft,
  Radio,
  Plus,
  Info,
  Terminal as TerminalIcon,
  PanelLeft,
  X,
  Trash2,
  Copy,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useSession,
  useCloseTerminal,
  usePauseSession,
  useResumeSession,
  useStopSession,
  useDeleteSession,
  useCloneSession,
  useSessionFiles,
  useSessionGitStatus,
  useReadSessionFile,
  useDeleteSessionFile,
  useWriteSessionFile,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import type { SessionStatus } from "@/lib/api/types";

import { FileTree } from "./components/file-tree";
import { TerminalView } from "./components/terminal-view";
import { FileEditor } from "./components/file-editor";
import { TabBar, type Tab } from "./components/tab-bar";

const providerLabels: Record<string, string> = {
  CLAUDE: "Claude",
  OPENAI: "OpenAI",
  OPENROUTER: "OpenRouter",
  GEMINI: "Gemini",
  GROQ: "Groq",
  CLAUDE_CODE_LOCAL: "Claude Code",
  OPENCLAW: "OpenClaw",
};

let terminalCounter = 0;

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { data: files = [], isLoading: filesLoading } = useSessionFiles(sessionId);
  const { data: gitStatuses = [] } = useSessionGitStatus(sessionId);
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();
  const deleteSession = useDeleteSession();
  const cloneSession = useCloneSession();
  const closeTerminalMutation = useCloseTerminal();
  const readFile = useReadSessionFile();
  const deleteFile = useDeleteSessionFile();
  const writeFile = useWriteSessionFile();

  // Tab state
  const agentTerminalId = `${sessionId}:agent`;

  // Build agent terminal command from session config
  const buildAgentCmd = useCallback((): string[] => {
    const provider = session?.aiCredential?.provider;
    if (!provider) {
      return ["bash"]; // No AI provider = plain bash
    }

    const args = session.startArguments?.trim() || "";

    // Map provider to CLI command
    let cli: string;
    if (provider === "OPENCLAW") {
      cli = "openclaw tui";
    } else {
      // CLAUDE_CODE_LOCAL and others default to claude
      cli = "claude";
    }

    const fullCmd = args ? `${cli} ${args}` : cli;
    return ["bash", "-c", `${fullCmd} && exec bash`];
  }, [session?.aiCredential?.provider, session?.startArguments]);

  const [tabs, setTabs] = useState<Tab[]>([]);

  // Initialize tabs when session loads
  useEffect(() => {
    if (!session || tabs.length > 0) return;
    const hasAgent = !!session.aiCredentialId;
    setTabs([
      {
        id: agentTerminalId,
        title: hasAgent ? "Agent" : "Terminal",
        type: "terminal",
        closeable: true,
        terminalId: agentTerminalId,
        cmd: buildAgentCmd(),
      },
    ]);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeTabId, setActiveTabId] = useState(agentTerminalId);
  const [fileContents, setFileContents] = useState<
    Record<string, { content: string | null; loading: boolean }>
  >({});

  // ─── Resizable sidebar ──────────────────────────────────────
  const SIDEBAR_MIN = 160;
  const SIDEBAR_MAX = 480;
  const SIDEBAR_DEFAULT = 240;
  const MAIN_MIN = 300;
  const MOBILE_BREAKPOINT = 768;

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop drag-resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      e.preventDefault();
      isResizing.current = true;

      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
        let newWidth = startWidth + (ev.clientX - startX);
        newWidth = Math.max(SIDEBAR_MIN, Math.min(newWidth, SIDEBAR_MAX, containerWidth - MAIN_MIN));
        setSidebarWidth(newWidth);
      };

      const onUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [isMobile, sidebarWidth],
  );

  const { socket } = useSocket();

  // Listen for status changes
  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleStatus = (payload: { sessionId: string; status: string }) => {
      if (payload.sessionId === sessionId) refetch();
    };

    socket.on("session:status", handleStatus);
    return () => {
      socket.off("session:status", handleStatus);
    };
  }, [socket, sessionId, refetch]);

  // Refresh open files when terminal has output (agent may have changed files)
  const refreshDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleOutput = () => {
      // Debounce: refresh files 2s after last terminal output
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        // Refresh all open file tabs
        for (const tab of tabs) {
          if (tab.type === "file" && tab.filePath) {
            const fullPath = `/workspace/${tab.filePath}`;
            readFile
              .mutateAsync({ id: sessionId, path: fullPath })
              .then((result) => {
                setFileContents((prev) => {
                  const current = prev[tab.id];
                  // Only update if content actually changed
                  if (current?.content === result.content) return prev;
                  return {
                    ...prev,
                    [tab.id]: { content: result.content, loading: false },
                  };
                });
              })
              .catch(() => {});
          }
        }
      }, 2000);
    };

    socket.on("session:output", handleOutput);
    return () => {
      socket.off("session:output", handleOutput);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [socket, sessionId, tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tab Handlers ──────────────────────────────────────────────

  const handleNewTerminal = useCallback(() => {
    const num = ++terminalCounter;
    const termId = `${sessionId}:term-${Date.now()}`;
    setTabs((prev) => [
      ...prev,
      {
        id: termId,
        title: `Terminal ${num}`,
        type: "terminal",
        closeable: true,
        terminalId: termId,
        cmd: ["bash"],
      },
    ]);
    setActiveTabId(termId);
  }, [sessionId]);

  const handleOpenFile = useCallback(
    async (relativePath: string) => {
      const fullPath = `/workspace/${relativePath}`;
      const tabId = `file:${relativePath}`;

      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
        setActiveTabId(tabId);
        return;
      }

      const fileName = relativePath.split("/").pop() || relativePath;
      setTabs((prev) => [
        ...prev,
        {
          id: tabId,
          title: fileName,
          type: "file",
          filePath: relativePath,
          closeable: true,
        },
      ]);
      setActiveTabId(tabId);

      setFileContents((prev) => ({
        ...prev,
        [tabId]: { content: null, loading: true },
      }));

      try {
        const result = await readFile.mutateAsync({
          id: sessionId,
          path: fullPath,
        });
        setFileContents((prev) => ({
          ...prev,
          [tabId]: { content: result.content, loading: false },
        }));
      } catch {
        setFileContents((prev) => ({
          ...prev,
          [tabId]: { content: null, loading: false },
        }));
      }
    },
    [tabs, sessionId, readFile],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (tab.type === "terminal" && tab.terminalId) {
        closeTerminalMutation.mutate({
          sessionId,
          terminalId: tab.terminalId,
        });
      }

      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      setFileContents((prev) => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });

      if (activeTabId === tabId) {
        // Switch to first available tab
        const remaining = tabs.filter((t) => t.id !== tabId);
        setActiveTabId(remaining[0]?.id || "");
      }
    },
    [tabs, activeTabId, sessionId, closeTerminalMutation],
  );

  const handleCloseOtherTabs = useCallback(
    (keepTabId: string) => {
      const toClose = tabs.filter((t) => t.closeable && t.id !== keepTabId);
      for (const t of toClose) {
        if (t.type === "terminal" && t.terminalId) {
          closeTerminalMutation.mutate({
            sessionId,
            terminalId: t.terminalId,
          });
        }
        setFileContents((prev) => {
          const next = { ...prev };
          delete next[t.id];
          return next;
        });
      }
      setTabs((prev) =>
        prev.filter((t) => !t.closeable || t.id === keepTabId),
      );
      setActiveTabId(keepTabId);
    },
    [tabs, sessionId, closeTerminalMutation],
  );

  const handleCloseAllFileTabs = useCallback(() => {
    const fileTabIds = tabs
      .filter((t) => t.type === "file" && t.closeable)
      .map((t) => t.id);
    setTabs((prev) =>
      prev.filter((t) => t.type !== "file" || !t.closeable),
    );
    setFileContents((prev) => {
      const next = { ...prev };
      for (const id of fileTabIds) delete next[id];
      return next;
    });
    if (fileTabIds.includes(activeTabId)) {
      setActiveTabId(tabs.find((t) => t.type === "terminal")?.id || "");
    }
  }, [tabs, activeTabId]);

  const handleRenameTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      const newName = prompt("Rename tab:", tab.title);
      if (newName && newName.trim()) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId ? { ...t, title: newName.trim() } : t,
          ),
        );
      }
    },
    [tabs],
  );

  // ─── Keyboard Shortcuts ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Prevent browser defaults when focus is in session page
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Block browser refresh/replace/find when inside session
        if (["r", "g", "p"].includes(key)) {
          // Only block if not in an input/textarea
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── File Operations ───────────────────────────────────────────

  const handleNewFile = useCallback(
    async (dirPath: string) => {
      const name = prompt("New file name:");
      if (!name?.trim()) return;
      const filePath = dirPath === "." ? name : `${dirPath}/${name}`;
      const fullPath = `/workspace/${filePath}`;
      try {
        await writeFile.mutateAsync({
          id: sessionId,
          path: fullPath,
          content: "",
        });
        handleOpenFile(filePath);
      } catch {
        toast.error("Failed to create file");
      }
    },
    [sessionId, writeFile, handleOpenFile],
  );

  const handleNewFolder = useCallback(
    async (dirPath: string) => {
      const name = prompt("New folder name:");
      if (!name?.trim()) return;
      const folderPath = dirPath === "." ? name : `${dirPath}/${name}`;
      const fullPath = `/workspace/${folderPath}`;
      try {
        // Create folder by creating a .gitkeep inside it
        await writeFile.mutateAsync({
          id: sessionId,
          path: `${fullPath}/.gitkeep`,
          content: "",
        });
        toast.success(`Created folder: ${name}`);
      } catch {
        toast.error("Failed to create folder");
      }
    },
    [sessionId, writeFile],
  );

  const handleSaveFile = useCallback(
    (tabId: string, content: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.filePath) return;
      writeFile.mutate({
        id: sessionId,
        path: `/workspace/${tab.filePath}`,
        content,
      });
    },
    [tabs, sessionId, writeFile],
  );

  const handleRefreshFile = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.filePath) return;
      try {
        const result = await readFile.mutateAsync({
          id: sessionId,
          path: `/workspace/${tab.filePath}`,
        });
        setFileContents((prev) => ({
          ...prev,
          [tabId]: { content: result.content, loading: false },
        }));
      } catch {
        // ignore
      }
    },
    [tabs, sessionId, readFile],
  );

  const handleDeleteFile = useCallback(
    async (relativePath: string) => {
      if (!confirm(`Delete ${relativePath}?`)) return;
      try {
        await deleteFile.mutateAsync({
          id: sessionId,
          path: `/workspace/${relativePath}`,
        });
        handleTabClose(`file:${relativePath}`);
      } catch {
        // ignore
      }
    },
    [sessionId, deleteFile, handleTabClose],
  );

  const handleRenameFile = useCallback(
    async (relativePath: string) => {
      const fileName = relativePath.split("/").pop() || "";
      const newName = prompt("Rename to:", fileName);
      if (!newName || newName === fileName) return;
      const dir = relativePath.substring(
        0,
        relativePath.length - fileName.length,
      );
      const _newPath = `${dir}${newName}`;
      if (!session?.containerId) return;

      try {
        toast.info(`Rename: ${fileName} -> ${newName} (path: ${_newPath})`);
      } catch {
        // ignore
      }
    },
    [session],
  );

  // ─── Session Lifecycle ─────────────────────────────────────────

  const handlePause = async () => {
    try {
      await pauseSession.mutateAsync(sessionId);
      refetch();
    } catch {
      toast.error("Failed to pause session");
    }
  };

  const handleResume = async () => {
    try {
      await resumeSession.mutateAsync(sessionId);
      refetch();
    } catch {
      toast.error("Failed to resume session");
    }
  };

  const handleStop = async () => {
    try {
      await stopSession.mutateAsync(sessionId);
      refetch();
    } catch {
      toast.error("Failed to stop session");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success("Session deleted");
      router.push("/sessions");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const handleClone = async () => {
    try {
      const cloned = await cloneSession.mutateAsync(sessionId);
      toast.success("Session cloned");
      router.push(`/sessions/${cloned.id}`);
    } catch {
      toast.error("Failed to clone session");
    }
  };

  // ─── Render ────────────────────────────────────────────────────

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
  const isCompleted = currentStatus === "COMPLETED";
  const isActive = isRunning || isPaused;

  return (
    <div className="flex flex-col absolute inset-0 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/sessions")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              <h1 className="font-semibold text-sm">{session.name}</h1>
              <Badge
                variant={
                  isRunning
                    ? "default"
                    : isPaused
                      ? "secondary"
                      : currentStatus === "FAILED"
                        ? "destructive"
                        : "outline"
                }
                className="gap-1"
              >
                {isRunning && <Radio className="w-3 h-3 animate-pulse" />}
                {currentStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {session.project?.name || "No project"}
              {session.aiCredential &&
                ` · ${providerLabels[session.aiCredential.provider] || session.aiCredential.provider}`}
              {session.enableDocker && " · Docker"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewTerminal}
                title="New Terminal"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-xs text-xs space-y-1 p-3"
                  >
                    <p className="font-semibold mb-1.5">Keyboard Shortcuts</p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Ctrl+S</kbd>
                      <span>Save file</span>
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Ctrl+F</kbd>
                      <span>Find in file</span>
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Ctrl+H</kbd>
                      <span>Find &amp; Replace</span>
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Ctrl+G</kbd>
                      <span>Go to line</span>
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Ctrl+P</kbd>
                      <span>Command palette</span>
                      <kbd className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Middle Click</kbd>
                      <span>Close tab</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          {isRunning && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
          {(isPaused || isCompleted) && (
            <Button variant="outline" size="sm" onClick={handleResume}>
              <Play className="w-4 h-4 mr-1" /> Resume
            </Button>
          )}
          {isActive && (
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="w-4 h-4 mr-1" /> Stop
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{session.name}&quot;? The
                  container and all data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile sidebar toggle */}
        {isMobile && !mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="absolute top-2 left-2 z-20 p-1.5 rounded-md bg-background border shadow-sm hover:bg-muted transition-colors"
            title="Show files"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Mobile overlay */}
        {isMobile && mobileSidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* File Browser Sidebar */}
        {isMobile ? (
          <div
            className={`absolute top-0 left-0 z-40 h-full w-64 bg-background shadow-xl transition-transform duration-200 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Files
              </p>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="h-[calc(100%-37px)]">
              <FileTree
                files={files}
                basePath="/workspace"
                isLoading={filesLoading}
                onFileClick={(path) => {
                  handleOpenFile(path);
                  setMobileSidebarOpen(false);
                }}
                onDelete={handleDeleteFile}
                onRename={handleRenameFile}
                onNewFile={handleNewFile}
                onNewFolder={handleNewFolder}
                gitStatuses={gitStatuses}
                hideHeader
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: sidebarWidth }} className="shrink-0 h-full">
              <FileTree
                files={files}
                basePath="/workspace"
                isLoading={filesLoading}
                onFileClick={handleOpenFile}
                onDelete={handleDeleteFile}
                onRename={handleRenameFile}
                onNewFile={handleNewFile}
                onNewFolder={handleNewFolder}
                gitStatuses={gitStatuses}
              />
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeStart}
              className="w-1 shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
            />
          </>
        )}

        {/* Editor / Terminal Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onTabClose={handleTabClose}
            onCloseOthers={handleCloseOtherTabs}
            onCloseAll={handleCloseAllFileTabs}
            onRename={handleRenameTab}
          />

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Terminal tabs */}
            {tabs
              .filter((t) => t.type === "terminal")
              .map((tab) => (
                <div
                  key={tab.id}
                  className="bg-[#0a0a0a]"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: activeTabId === tab.id ? "block" : "none",
                  }}
                >
                  {isActive ? (
                    <TerminalView
                      sessionId={sessionId}
                      terminalId={tab.terminalId!}
                      isRunning={isRunning}
                      cmd={tab.cmd}
                      isVisible={activeTabId === tab.id}
                    />
                  ) : isCompleted ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-3">Session stopped</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResume}
                        >
                          <Play className="w-4 h-4 mr-1" /> Resume
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <TerminalIcon className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                </div>
              ))}

            {/* File tabs */}
            {tabs
              .filter((t) => t.type === "file")
              .map((tab) => (
                <div
                  key={tab.id}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: activeTabId === tab.id ? "block" : "none",
                  }}
                >
                  <FileEditor
                    filePath={tab.filePath || ""}
                    content={fileContents[tab.id]?.content ?? null}
                    isLoading={fileContents[tab.id]?.loading ?? true}
                    onSave={(content) => handleSaveFile(tab.id, content)}
                    onContentRefresh={() => handleRefreshFile(tab.id)}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
