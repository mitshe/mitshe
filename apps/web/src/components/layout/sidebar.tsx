"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FolderKanban,
  ListTodo,
  MessageSquareCode,
  Workflow,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
  Camera,
  MessageSquarePlus,
  Trash2,
  Loader2,
  MoreHorizontal,
  Zap,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useChatConversations,
  useCreateChatConversation,
  useDeleteChatConversation,
  useAICredentials,
  useSessions,
} from "@/lib/api/hooks";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tourId: string;
}

type SidebarMode = "chat" | "workspace";

const workspaceNavItems: NavItem[] = [
  { title: "Threads", href: "/sessions", icon: MessageSquareCode, tourId: "nav-sessions" },
  { title: "Workflows", href: "/workflows", icon: Workflow, tourId: "nav-workflows" },
  { title: "Tasks", href: "/tasks", icon: ListTodo, tourId: "nav-tasks" },
  { title: "Projects", href: "/projects", icon: FolderKanban, tourId: "nav-projects" },
  { title: "Snapshots", href: "/images", icon: Camera, tourId: "nav-snapshots" },
  { title: "Skills", href: "/skills", icon: Zap, tourId: "nav-skills" },
];

const MODES: { key: SidebarMode; label: string; icon: React.ComponentType<{ className?: string }>; defaultHref: string }[] = [
  { key: "chat", label: "Chat", icon: MessageCircle, defaultHref: "/chat" },
  { key: "workspace", label: "Workspace", icon: Boxes, defaultHref: "/sessions" },
];

function getModeFromPath(pathname: string): SidebarMode | null {
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return "chat";
  if (
    pathname.startsWith("/sessions") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/skills") ||
    pathname.startsWith("/workflows") ||
    pathname.startsWith("/executions") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/projects")
  ) return "workspace";
  return null;
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const pathMode = getModeFromPath(pathname);
  const [stickyMode, setStickyMode] = useState<SidebarMode>("chat");

  useEffect(() => {
    if (pathMode) setStickyMode(pathMode);
  }, [pathMode]);

  const activeMode = pathMode ?? stickyMode;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 mb-4">
        {MODES.map((mode) => {
          const isActiveMode = activeMode === mode.key;
          return (
            <Link
              key={mode.key}
              href={mode.defaultHref}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                isActiveMode
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <mode.icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </Link>
          );
        })}
      </div>

      {activeMode === "chat" && <ChatSidebarContent onNavigate={onNavigate} />}

      {activeMode === "workspace" && (
        <WorkspaceNavContent onNavigate={onNavigate} />
      )}

    </TooltipProvider>
  );
}

function WorkspaceNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <div className="space-y-0.5">
        {workspaceNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-tour={item.tourId}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              isActive(item.href)
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        ))}
      </div>
      <RecentSessions />
    </>
  );
}

function RecentSessions() {
  const { data: sessions = [] } = useSessions();
  const typed = sessions as Array<{ id: string; name: string; status: string }>;
  const active = typed.filter((s) => s.status === "RUNNING" || s.status === "CREATING");
  const stopped = typed.filter((s) => s.status !== "RUNNING" && s.status !== "CREATING");
  const recent = stopped.slice(0, 5);

  if (active.length === 0 && recent.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {active.length > 0 && (
        <div className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
            Active
          </p>
          {active.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center gap-2.5 px-3 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="truncate">{s.name}</span>
            </Link>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
            Recent
          </p>
          {recent.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center gap-2.5 px-3 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="truncate">{s.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
  const { data: conversations = [], isLoading } = useChatConversations();
  const { data: credentials = [] } = useAICredentials();
  const createConversation = useCreateChatConversation();
  const deleteConversation = useDeleteChatConversation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => setActiveId(e.detail.conversationId);
    window.addEventListener("chat:select", handler as EventListener);
    return () => window.removeEventListener("chat:select", handler as EventListener);
  }, []);

  const handleNew = async () => {
    const defaultCred = credentials.find((c: { isDefault?: boolean }) => c.isDefault) || credentials[0];
    if (!defaultCred) return;
    const conv = await createConversation.mutateAsync({ aiCredentialId: defaultCred.id });
    setActiveId(conv.id);
    if (!isChatPage) {
      router.push("/chat");
    }
    window.dispatchEvent(new CustomEvent("chat:select", { detail: { conversationId: conv.id } }));
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    if (!isChatPage) {
      router.push("/chat");
    }
    window.dispatchEvent(new CustomEvent("chat:select", { detail: { conversationId: id } }));
    onNavigate?.();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteConversation.mutate(deleteTarget.id);
    if (activeId === deleteTarget.id) {
      setActiveId(null);
      window.dispatchEvent(new CustomEvent("chat:select", { detail: { conversationId: null } }));
    }
    setDeleteTarget(null);
  };

  const hasConversations = conversations.length > 0;

  return (
    <>
      <button
        onClick={handleNew}
        disabled={createConversation.isPending || credentials.length === 0}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full text-left disabled:opacity-50"
      >
        {createConversation.isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
        )}
        New chat
      </button>

      {credentials.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          <Link href="/settings/ai" className="underline hover:text-foreground transition-colors">
            Add an AI provider
          </Link>{" "}
          to start chatting.
        </p>
      )}

      {credentials.length > 0 && !hasConversations && !isLoading && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Click &ldquo;New chat&rdquo; to start a conversation with your AI provider.
        </p>
      )}

      {hasConversations && (
        <div className="mt-4 space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
            Recent
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationItem
                key={c.id}
                title={c.title || "New conversation"}
                isActive={activeId === c.id}
                onSelect={() => handleSelect(c.id)}
                onDelete={() =>
                  setDeleteTarget({ id: c.id, title: c.title || "New conversation" })
                }
              />
            ))
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo; and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ConversationItem({
  title,
  isActive,
  onSelect,
  onDelete,
}: {
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 px-3 py-1 rounded-md text-sm cursor-pointer transition-colors",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={onSelect}
    >
      <span className="flex-1 truncate pr-6">{title}</span>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded-md hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const isSettingsActive = pathname === "/settings" || pathname.startsWith("/settings/");

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col bg-sidebar rounded-xl items-center">
        <div className="flex h-14 items-center justify-center w-full shrink-0">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 py-3">
          {MODES.map((mode) => (
            <Link
              key={mode.key}
              href={mode.defaultHref}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={mode.label}
            >
              <mode.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
        <div className="py-2 w-full flex flex-col items-center gap-1.5 shrink-0">
          <Link
            href="/settings"
            className={cn(
              "p-2 rounded-md transition-colors",
              isSettingsActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar rounded-xl">
      <div className="flex h-14 items-center justify-between px-3 shrink-0">
        <Link href="/chat" className="flex items-center gap-2 font-semibold">
          <img src="/logo.svg" alt="mitshe" className="h-7 w-7" />
          <span className="font-brand text-sm">mitshe</span>
        </Link>
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-4">
        <SidebarContent />
      </div>
      <div className="px-3 py-2 shrink-0">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
            isSettingsActive
              ? "bg-secondary text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
