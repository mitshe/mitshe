"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  usePresets,
  useProjects,
  useRepositories,
  useAICredentials,
  useEnvironments,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api/hooks";
import type { SessionStatus, AgentDefinition } from "@/lib/api/types";

const providerLabels: Record<string, string> = {
  CLAUDE: "Claude",
  OPENAI: "OpenAI",
  OPENROUTER: "OpenRouter",
  GEMINI: "Gemini",
  GROQ: "Groq",
  CLAUDE_CODE_LOCAL: "Claude Code",
  OPENCLAW: "OpenClaw",
};

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
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("projectId") || "";
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { data: sessions = [], isLoading } = useSessions();

  const filteredSessions = useMemo(() => {
    if (!urlProjectId) return sessions;
    return sessions.filter((s) => s.projectId === urlProjectId);
  }, [sessions, urlProjectId]);
  const { data: presetsList = [] } = usePresets();
  const { data: projects = [] } = useProjects();
  const { data: repositories = [] } = useRepositories();
  const { data: aiCredentials = [] } = useAICredentials();
  const { data: environmentsList = [] } = useEnvironments();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  // Auto-refresh list when session status changes
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    };
    socket.on("session:status", handler);
    return () => { socket.off("session:status", handler); };
  }, [socket, queryClient]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    agentDefinitionId: "",
    name: "",
    projectId: "",
    repositoryIds: [] as string[],
    aiCredentialId: "",
    startArguments: "",
    environmentId: "",
    instructions: "",
  });

  const handleAgentSelect = (agentId: string) => {
    const agent = presetsList.find((a) => a.id === agentId);
    if (!agent) {
      setForm((prev) => ({ ...prev, agentDefinitionId: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      agentDefinitionId: agentId,
      aiCredentialId: agent.aiCredentialId || prev.aiCredentialId,
      startArguments: agent.startArguments || prev.startArguments,
      instructions: agent.instructions || prev.instructions,
      projectId: agent.defaultProjectId || prev.projectId,
      repositoryIds:
        agent.defaultRepositories?.map((r) => r.repositoryId) ||
        prev.repositoryIds,
    }));
  };

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
    // Repositories not strictly required — session can work without them

    try {
      const session = await createSession.mutateAsync({
        name: form.name,
        projectId: form.projectId || undefined,
        repositoryIds: form.repositoryIds,
        aiCredentialId: form.aiCredentialId || undefined,
        agentDefinitionId: form.agentDefinitionId || undefined,
        startArguments: form.startArguments || undefined,
        environmentId: form.environmentId || undefined,
        instructions: form.instructions || undefined,
      });
      toast.success("Session created");
      setIsCreateOpen(false);
      setForm({
        agentDefinitionId: "",
        name: "",
        projectId: "",
        repositoryIds: [],
        aiCredentialId: "",
        startArguments: "",
    environmentId: "",
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
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>New Session</DialogTitle>
              <DialogDescription>
                Start an interactive session in an isolated environment
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4 overflow-y-auto">
              <div className="space-y-2">
                <Label>Preset (optional)</Label>
                <Select
                  value={form.agentDefinitionId}
                  onValueChange={handleAgentSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preset - configure manually" />
                  </SelectTrigger>
                  <SelectContent>
                    {presetsList.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No presets defined.{" "}
                        <a href="/presets" className="underline">
                          Create one
                        </a>
                      </div>
                    ) : (
                      presetsList.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                          {a.description && (
                            <span className="text-muted-foreground ml-2">
                              - {a.description}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Session Name *</Label>
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
                <Label>AI Provider (optional)</Label>
                <Select
                  value={form.aiCredentialId}
                  onValueChange={(v) =>
                    setForm({ ...form, aiCredentialId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None - plain bash terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiCredentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {providerLabels[c.provider] || c.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startArgs">Start Arguments (optional)</Label>
                <Input
                  id="startArgs"
                  value={form.startArguments}
                  onChange={(e) =>
                    setForm({ ...form, startArguments: e.target.value })
                  }
                  placeholder="e.g., --dangerously-skip-permissions --model opus"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Environment (optional)</Label>
                <Select
                  value={form.environmentId}
                  onValueChange={(v) =>
                    setForm({ ...form, environmentId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Default environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environmentsList.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                        {env.description && (
                          <span className="text-muted-foreground ml-2">
                            - {env.description}
                          </span>
                        )}
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
                  placeholder="System instructions for the agent..."
                  rows={4}
                />
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
                disabled={createSession.isPending || !form.name.trim()}
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
          ) : filteredSessions.length === 0 ? (
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
              {filteredSessions.map((session) => {
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
                          <span>{providerLabels[session.aiCredential.provider] || session.aiCredential.provider}</span>
                        )}
                        {session.repositories && session.repositories.length > 0 && (
                          <span className="truncate max-w-[200px]">
                            {session.repositories
                              .map((r) => r.repository?.name || "")
                              .filter(Boolean)
                              .join(", ")}
                          </span>
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
