"use client";

import { useState, useEffect, useCallback } from "react";
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
  Terminal as TerminalIcon,
} from "lucide-react";
import {
  useSession,
  usePauseSession,
  useResumeSession,
  useStopSession,
  useSessionFiles,
  useReadSessionFile,
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
};

const TERMINAL_TAB_ID = "terminal";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { data: files = [] } = useSessionFiles(sessionId);
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();
  const readFile = useReadSessionFile();
  const writeFile = useWriteSessionFile();
  const [resumedFromCompleted, setResumedFromCompleted] = useState(false);

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: TERMINAL_TAB_ID,
      title: "Terminal",
      type: "terminal",
      closeable: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(TERMINAL_TAB_ID);
  const [fileContents, setFileContents] = useState<
    Record<string, { content: string | null; loading: boolean }>
  >({});

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
    return () => {
      socket.off("session:status", handleStatus);
    };
  }, [socket, sessionId, refetch]);

  const handleOpenFile = useCallback(
    async (relativePath: string) => {
      // Full path inside container
      const fullPath = `/workspace/${relativePath}`;
      const tabId = `file:${relativePath}`;

      // Check if tab already exists
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
        setActiveTabId(tabId);
        return;
      }

      // Add tab
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

      // Load file content
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

  const handleSaveFile = useCallback(
    (tabId: string, content: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.filePath) return;
      const fullPath = `/workspace/${tab.filePath}`;
      writeFile.mutate({ id: sessionId, path: fullPath, content });
    },
    [tabs, sessionId, writeFile],
  );

  const handleRefreshFile = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.filePath) return;
      const fullPath = `/workspace/${tab.filePath}`;
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
        // ignore refresh errors
      }
    },
    [tabs, sessionId, readFile],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      if (tabId === TERMINAL_TAB_ID) return;

      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      setFileContents((prev) => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });

      // Switch to terminal if closing active tab
      if (activeTabId === tabId) {
        setActiveTabId(TERMINAL_TAB_ID);
      }
    },
    [activeTabId],
  );

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
      const wasCompleted = session?.status === "COMPLETED";
      await resumeSession.mutateAsync(sessionId);
      if (wasCompleted) setResumedFromCompleted(true);
      refetch();
    } catch {
      toast.error("Failed to resume session");
    }
  };

  const handleStop = async () => {
    try {
      await stopSession.mutateAsync(sessionId);
      setResumedFromCompleted(false);
      refetch();
    } catch {
      toast.error("Failed to stop session");
    }
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
  const isCompleted = currentStatus === "COMPLETED";
  const isActive = isRunning || isPaused;
  const canShowTerminal = isRunning || isPaused;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
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
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File Browser - Left Panel */}
        <FileTree
          files={files}
          basePath="/workspace"
          isLoading={isActive && files.length === 0}
          onFileClick={handleOpenFile}
        />

        {/* Editor / Terminal Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onTabClose={handleTabClose}
          />

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Terminal tab - always mounted to keep state, hidden when not active */}
            <div
              className="bg-[#0a0a0a]"
              style={{
                width: "100%",
                height: "100%",
                display:
                  activeTabId === TERMINAL_TAB_ID ? "block" : "none",
              }}
            >
              {canShowTerminal ? (
                <TerminalView
                  sessionId={sessionId}
                  isRunning={isRunning}
                  wasCompleted={resumedFromCompleted}
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
                      <Play className="w-4 h-4 mr-1" /> Resume with
                      --continue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Session is {currentStatus.toLowerCase()}</p>
                  </div>
                </div>
              )}
            </div>

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
