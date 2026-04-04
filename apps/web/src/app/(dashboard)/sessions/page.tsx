"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Loader2,
  MessageSquareCode,
  Play,
  Pause,
  Square,
  Clock,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useProjects,
  useRepositories,
  useAICredentials,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api/hooks";
import type { SessionStatus } from "@/lib/api/types";

const statusConfig: Record<
  SessionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  CREATING: {
    label: "Creating",
    variant: "outline",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  RUNNING: {
    label: "Running",
    variant: "default",
    icon: <Play className="w-3 h-3" />,
  },
  PAUSED: {
    label: "Paused",
    variant: "secondary",
    icon: <Pause className="w-3 h-3" />,
  },
  COMPLETED: {
    label: "Completed",
    variant: "outline",
    icon: <Square className="w-3 h-3" />,
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: <Square className="w-3 h-3" />,
  },
};

export default function SessionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { data: sessions = [], isLoading } = useSessions();
  const { data: projects = [] } = useProjects();
  const { data: repositories = [] } = useRepositories();
  const { data: aiCredentials = [] } = useAICredentials();

  // Auto-refresh list when session status changes
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    };
    socket.on("session:status", handler);
    return () => { socket.off("session:status", handler); };
  }, [socket, queryClient]);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    projectId: "",
    repositoryIds: [] as string[],
    aiCredentialId: "",
    instructions: "",
  });

  const toggleRepo = (repoId: string) => {
    setForm((prev) => ({
      ...prev,
      repositoryIds: prev.repositoryIds.includes(repoId)
        ? prev.repositoryIds.filter((id) => id !== repoId)
        : [...prev.repositoryIds, repoId],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a session name");
      return;
    }
    if (form.repositoryIds.length === 0) {
      toast.error("Please select at least one repository");
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        name: form.name,
        projectId: form.projectId || undefined,
        repositoryIds: form.repositoryIds,
        aiCredentialId: form.aiCredentialId || undefined,
        instructions: form.instructions || undefined,
      });
      toast.success("Session created");
      setIsCreateOpen(false);
      setForm({
        name: "",
        projectId: "",
        repositoryIds: [],
        aiCredentialId: "",
        instructions: "",
      });
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create session";
      toast.error(message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteSession.mutateAsync(id);
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const activeRepos = repositories.filter((r) => r.isActive);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            Interactive AI agent sessions with isolated environments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Agent Session</DialogTitle>
              <DialogDescription>
                Start an interactive session with Claude Code in an isolated
                environment
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Refactor auth module"
                />
              </div>

              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Repositories</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {activeRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      No active repositories. Import some first.
                    </p>
                  ) : (
                    activeRepos.map((repo) => (
                      <label
                        key={repo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={form.repositoryIds.includes(repo.id)}
                          onCheckedChange={() => toggleRepo(repo.id)}
                        />
                        <span className="text-sm truncate">
                          {repo.fullPath}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={form.aiCredentialId}
                  onValueChange={(v) =>
                    setForm({ ...form, aiCredentialId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiCredentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">
                  Instructions (optional)
                </Label>
                <Textarea
                  id="instructions"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  placeholder="System instructions for the agent (like CLAUDE.md)..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These will be written as CLAUDE.md in the workspace
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createSession.isPending ||
                  !form.name.trim() ||
                  form.repositoryIds.length === 0
                }
              >
                {createSession.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Start Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            Click on a session to open the interactive terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquareCode className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sessions</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start your first interactive AI agent session
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const config = statusConfig[session.status as SessionStatus];
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/sessions/${session.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {session.name}
                        </span>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {session.project && (
                          <span>{session.project.name}</span>
                        )}
                        {session.aiCredential && (
                          <span>{session.aiCredential.provider}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(session.lastActiveAt))}
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(session.status === "COMPLETED" ||
                        session.status === "FAILED" ||
                        session.status === "PAUSED") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/sessions/${session.id}`)
                          }
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Open
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Session
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;
                              {session.name}&quot;? The container and all
                              data will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => handleDelete(e, session.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
