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
  Copy,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useRecreateSession,
  useDeleteSession,
  usePauseSession,
  useStopSession,
  useCloneSession,
  usePresets,
  useProjects,
  useRepositories,
  useAICredentials,
  useEnvironments,
  useIntegrations,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api/hooks";
import type { AgentSession, SessionStatus } from "@/lib/api/types";

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
  const { data: connectedIntegrations = [] } = useIntegrations();

  const activeIntegrations = connectedIntegrations.filter(
    (i) => i.status === "CONNECTED",
  );
  const defaultGithubId = activeIntegrations.find(
    (i) => i.type === "GITHUB",
  )?.id;
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const recreateSession = useRecreateSession();
  const deleteSession = useDeleteSession();
  const pauseSession = usePauseSession();
  const stopSession = useStopSession();
  const cloneSession = useCloneSession();

  // Auto-refresh list when session status changes
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    };
    socket.on("session:status", handler);
    return () => { socket.off("session:status", handler); };
  }, [socket, queryClient]);

  const emptyForm = {
    agentDefinitionId: "",
    name: "",
    projectId: "",
    repositoryIds: [] as string[],
    integrationIds: [] as string[],
    aiCredentialId: "",
    startArguments: "",
    environmentId: "",
    enableDocker: false,
    instructions: "",
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<SessionStatus | null>(
    null,
  );
  const [originalForm, setOriginalForm] = useState<typeof emptyForm | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);

  // Config fields cannot be edited while the container is running — would
  // require destroying the running container mid-work. Metadata (name,
  // project, instructions) is always editable.
  const configLocked =
    editingId !== null &&
    editingStatus !== "COMPLETED" &&
    editingStatus !== "FAILED";

  // Set default GitHub integration once data loads
  useEffect(() => {
    if (defaultGithubId && form.integrationIds.length === 0 && !form.environmentId) {
      setForm((prev) => ({
        ...prev,
        integrationIds: prev.integrationIds.length === 0 && !prev.environmentId
          ? [defaultGithubId]
          : prev.integrationIds,
      }));
    }
  }, [defaultGithubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setEditingStatus(null);
    setOriginalForm(null);
    setForm({
      ...emptyForm,
      integrationIds: defaultGithubId ? [defaultGithubId] : [],
    });
    setIsDialogOpen(true);
  };

  const openEdit = (session: AgentSession) => {
    const initial = {
      agentDefinitionId: session.agentDefinitionId || "",
      name: session.name,
      projectId: session.projectId || "",
      repositoryIds:
        session.repositories?.map((r) => r.repositoryId) || [],
      integrationIds:
        session.integrations?.map((i) => i.integrationId) || [],
      aiCredentialId: session.aiCredentialId || "",
      startArguments: session.startArguments || "",
      environmentId: session.environmentId || "",
      enableDocker: session.enableDocker,
      instructions: session.instructions || "",
    };
    setEditingId(session.id);
    setEditingStatus(session.status);
    setOriginalForm(initial);
    setForm(initial);
    setIsDialogOpen(true);
  };

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

  const setEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sa = new Set(a);
    return b.every((x) => sa.has(x));
  };

  const metadataFields = ["name", "projectId", "instructions"] as const;
  const configFields = [
    "agentDefinitionId",
    "aiCredentialId",
    "startArguments",
    "environmentId",
    "enableDocker",
  ] as const;

  const computeChanges = () => {
    if (!originalForm) return { metadataChanged: false, configChanged: false };
    const metadataChanged = metadataFields.some(
      (f) => form[f] !== originalForm[f],
    );
    const scalarConfigChanged = configFields.some(
      (f) => form[f] !== originalForm[f],
    );
    const configChanged =
      scalarConfigChanged ||
      !setEqual(form.repositoryIds, originalForm.repositoryIds) ||
      !setEqual(form.integrationIds, originalForm.integrationIds);
    return { metadataChanged, configChanged };
  };

  const { metadataChanged, configChanged } = computeChanges();
  const submitDisabled =
    !form.name.trim() ||
    createSession.isPending ||
    updateSession.isPending ||
    recreateSession.isPending ||
    (editingId !== null && !metadataChanged && !configChanged) ||
    (configChanged && configLocked);
  const submitLabel = editingId
    ? configChanged
      ? "Save & Restart"
      : "Save"
    : "Start Session";

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    // Create flow
    if (!editingId) {
      try {
        const session = await createSession.mutateAsync({
          name: form.name,
          projectId: form.projectId || undefined,
          repositoryIds: form.repositoryIds,
          integrationIds:
            form.integrationIds.length > 0 ? form.integrationIds : undefined,
          aiCredentialId: form.aiCredentialId || undefined,
          agentDefinitionId: form.agentDefinitionId || undefined,
          startArguments: form.startArguments || undefined,
          environmentId: form.environmentId || undefined,
          enableDocker: form.enableDocker || undefined,
          instructions: form.instructions || undefined,
        });
        toast.success("Session created");
        setIsDialogOpen(false);
        setForm({
          ...emptyForm,
          integrationIds: defaultGithubId ? [defaultGithubId] : [],
        });
        router.push(`/sessions/${session.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create session";
        toast.error(message);
      }
      return;
    }

    // Edit flow
    if (!metadataChanged && !configChanged) {
      toast.info("No changes to save");
      return;
    }

    if (configChanged && configLocked) {
      toast.error(
        "Stop the session first to reconfigure container settings",
      );
      return;
    }

    try {
      if (configChanged) {
        await recreateSession.mutateAsync({
          id: editingId,
          data: {
            name: form.name,
            projectId: form.projectId,
            repositoryIds: form.repositoryIds,
            integrationIds: form.integrationIds,
            aiCredentialId: form.aiCredentialId,
            agentDefinitionId: form.agentDefinitionId,
            startArguments: form.startArguments,
            environmentId: form.environmentId,
            enableDocker: form.enableDocker,
            instructions: form.instructions,
          },
        });
        toast.success("Session reconfigured — restarting container");
      } else {
        await updateSession.mutateAsync({
          id: editingId,
          data: {
            name: form.name,
            projectId: form.projectId,
            instructions: form.instructions,
          },
        });
        toast.success("Session updated");
      }
      setIsDialogOpen(false);
      setEditingId(null);
      setEditingStatus(null);
      setOriginalForm(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save session";
      toast.error(message);
    }
  };

  const handleEdit = (e: React.MouseEvent, session: AgentSession) => {
    e.stopPropagation();
    openEdit(session);
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

  const handlePause = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await pauseSession.mutateAsync(id);
      toast.success("Session paused");
    } catch {
      toast.error("Failed to pause session");
    }
  };

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await stopSession.mutateAsync(id);
      toast.success("Session stopped");
    } catch {
      toast.error("Failed to stop session");
    }
  };

  const handleClone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const session = await cloneSession.mutateAsync(id);
      toast.success("Session cloned");
      router.push(`/sessions/${session.id}`);
    } catch {
      toast.error("Failed to clone session");
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
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setEditingStatus(null);
              setOriginalForm(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Session" : "New Session"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? configLocked
                    ? "Stop the session first to reconfigure container settings. Metadata can always be edited."
                    : "Changes to configuration will restart the container. Workspace files are preserved."
                  : "Start an interactive session in an isolated environment"}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4 overflow-y-auto">
              <div className="space-y-2">
                <Label>Preset (optional)</Label>
                <Select
                  value={form.agentDefinitionId}
                  onValueChange={handleAgentSelect}
                  disabled={configLocked}
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
                        className={`flex items-center gap-2 p-1.5 rounded ${
                          configLocked
                            ? "cursor-not-allowed opacity-60"
                            : "hover:bg-muted/50 cursor-pointer"
                        }`}
                      >
                        <Checkbox
                          checked={form.repositoryIds.includes(repo.id)}
                          onCheckedChange={() => toggleRepo(repo.id)}
                          disabled={configLocked}
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
                <Label>Integrations</Label>
                <p className="text-xs text-muted-foreground">
                  Credentials for selected integrations will be available inside
                  the session container
                </p>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {activeIntegrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      No connected integrations.{" "}
                      <a
                        href="/settings/integrations"
                        className="underline"
                      >
                        Configure some first
                      </a>
                    </p>
                  ) : (
                    activeIntegrations.map((integration) => (
                      <label
                        key={integration.id}
                        className={`flex items-center gap-2 p-1.5 rounded ${
                          configLocked
                            ? "cursor-not-allowed opacity-60"
                            : "hover:bg-muted/50 cursor-pointer"
                        }`}
                      >
                        <Checkbox
                          checked={form.integrationIds.includes(
                            integration.id,
                          )}
                          onCheckedChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              integrationIds:
                                prev.integrationIds.includes(integration.id)
                                  ? prev.integrationIds.filter(
                                      (id) => id !== integration.id,
                                    )
                                  : [...prev.integrationIds, integration.id],
                            }))
                          }
                          disabled={configLocked}
                        />
                        <span className="text-sm">{integration.type}</span>
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
                  disabled={configLocked}
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
                  disabled={configLocked}
                />
              </div>

              <div className="space-y-2">
                <Label>Environment (optional)</Label>
                <Select
                  value={form.environmentId}
                  onValueChange={(v) => {
                    const env = environmentsList.find((e) => e.id === v);
                    setForm({
                      ...form,
                      environmentId: v,
                      enableDocker: env?.enableDocker ?? form.enableDocker,
                      integrationIds:
                        env?.integrations?.map((i) => i.integrationId) ??
                        form.integrationIds,
                    })
                  }
                  }
                  disabled={configLocked}
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enableDocker"
                  checked={form.enableDocker}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, enableDocker: checked === true })
                  }
                  disabled={configLocked}
                />
                <Label
                  htmlFor="enableDocker"
                  className={`font-normal text-sm ${
                    configLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  Enable Docker
                </Label>
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
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitDisabled}>
                {(createSession.isPending ||
                  updateSession.isPending ||
                  recreateSession.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {submitLabel}
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
              <Button onClick={openCreate}>
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
                        {session.enableDocker && (
                          <span>Docker</span>
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
                      {session.status === "RUNNING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handlePause(e, session.id)}
                            title="Pause"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleStop(e, session.id)}
                            title="Stop"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
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
                      {session.status !== "CREATING" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleEdit(e, session)}
                          title={
                            session.status === "COMPLETED" ||
                            session.status === "FAILED"
                              ? "Edit"
                              : "Edit metadata (stop to reconfigure)"
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {session.containerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleClone(e, session.id)}
                          title="Clone"
                        >
                          <Copy className="w-3.5 h-3.5" />
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
