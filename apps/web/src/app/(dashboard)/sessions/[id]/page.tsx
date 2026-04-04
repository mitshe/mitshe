"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Send,
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
} from "lucide-react";
import {
  useSession,
  useSendSessionMessage,
  usePauseSession,
  useResumeSession,
  useStopSession,
  useSessionFiles,
} from "@/lib/api/hooks";
import { useSessionUpdates } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import type { SessionMessage, SessionStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// ─── File Tree Component ────────────────────────────────────────────

function buildFileTree(
  paths: string[],
  basePath: string,
): FileTreeNode[] {
  const root: Record<string, FileTreeNode> = {};

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
          children: isFile ? undefined : {},
        };
      }

      if (!isFile && current[part].children) {
        current = current[part].children as Record<string, FileTreeNode>;
      }
    }
  }

  function toArray(
    obj: Record<string, FileTreeNode>,
  ): FileTreeNode[] {
    return Object.values(obj)
      .map((node) => ({
        ...node,
        children: node.children
          ? toArray(node.children as Record<string, FileTreeNode>)
          : undefined,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toArray(root);
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[] | Record<string, FileTreeNode>;
}

function FileTreeItem({
  node,
  depth = 0,
}: {
  node: FileTreeNode & { children?: FileTreeNode[] };
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded cursor-default"
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
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
        {isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen &&
        (node.children as FileTreeNode[])?.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child as FileTreeNode & { children?: FileTreeNode[] }}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// ─── Chat Message Component ─────────────────────────────────────────

function ChatMessage({ message }: { message: SessionMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 py-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div
          className={cn(
            "text-[10px] mt-1 opacity-60",
            isUser ? "text-right" : "text-left",
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Session Page ──────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { data: files = [] } = useSessionFiles(sessionId);
  const sendMessage = useSendSessionMessage();
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();

  const { status: wsStatus, events, isProcessing } =
    useSessionUpdates(sessionId);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, events, scrollToBottom]);

  // Refetch session when status changes via WS
  useEffect(() => {
    if (wsStatus) {
      refetch();
    }
  }, [wsStatus, refetch]);

  // Refetch when processing completes
  useEffect(() => {
    if (!isProcessing && session?.messages?.length) {
      refetch();
    }
  }, [isProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isProcessing) return;

    setInput("");
    try {
      await sendMessage.mutateAsync({ id: sessionId, content });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

  const currentStatus = (wsStatus || session.status) as SessionStatus;
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
              {isProcessing && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing
                </Badge>
              )}
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
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button variant="outline" size="sm" onClick={handleResume}>
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          {isActive && (
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Browser - Left Panel */}
        <div className="w-60 border-r shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Files
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {fileTree.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {isActive ? "Loading files..." : "No files"}
                </p>
              ) : (
                fileTree.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node as FileTreeNode & { children?: FileTreeNode[] }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat - Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-1">
              {session.instructions && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Session Instructions
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                    {session.instructions}
                  </p>
                </div>
              )}

              {(!session.messages || session.messages.length === 0) &&
                !isProcessing && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">
                      {isRunning
                        ? "Session is ready. Send a message to start working with the agent."
                        : currentStatus === "CREATING"
                          ? "Setting up the environment..."
                          : "Session is not active."}
                    </p>
                  </div>
                )}

              {session.messages?.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Streaming events indicator */}
              {isProcessing && (
                <div className="flex gap-3 py-3">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Agent is working...
                    </div>
                    {events.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {events.slice(-10).map((evt, i) => (
                          <div
                            key={i}
                            className="text-xs text-muted-foreground font-mono truncate"
                          >
                            {evt.type === "log"
                              ? String(evt.message || "")
                              : `[${evt.type}]`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Bar */}
          <div className="px-4 py-3 border-t bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRunning
                    ? "Send a message to the agent..."
                    : "Session is not running"
                }
                disabled={!isRunning || isProcessing}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={
                  !isRunning || isProcessing || !input.trim()
                }
                size="icon"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
