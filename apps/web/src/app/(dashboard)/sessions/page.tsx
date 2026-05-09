"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Loader2,
  MessageSquareCode,
  Play,
  Pause,
  Square,
  Clock,
  Trash2,
  Pencil,
  Search,
  MoreHorizontal,
  CheckSquare,
  Activity,
  GitBranch,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useRecreateSession,
  useDeleteSession,
  useStopSession,
  useProjects,
  useRepositories,
  useRepoBranches,
  useAICredentials,
  useIntegrations,
  useSnapshots,
  useSkills,
} from "@/lib/api/hooks";
import { useSocket } from "@/lib/socket/socket-context";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api/hooks";
import type { AgentSession, SessionStatus } from "@/lib/api/types";

import { providerLabels } from "@/lib/status-config";
import { ThreadFormFields } from "./components/thread-form-fields";

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
    label: "Stopped",
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
  const urlSnapshotId = searchParams.get("snapshot") || "";
  const urlNewSession = searchParams.get("newSession") === "1";
  const urlTaskName = searchParams.get("taskName") || "";
  const urlTaskInstructions = searchParams.get("taskInstructions") || "";
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { data: sessions = [], isLoading } = useSessions();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (urlProjectId) {
      result = result.filter((s) => s.projectId === urlProjectId);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }
    return result;
  }, [sessions, urlProjectId, search, filterStatus]);
  const { data: projects = [] } = useProjects();
  const { data: repositories = [] } = useRepositories();
  const { data: aiCredentials = [] } = useAICredentials();
  const { data: snapshotsList = [] } = useSnapshots();
  const readySnapshots = snapshotsList.filter((s: { status: string }) => s.status === "READY");
  const { data: skillsList = [] } = useSkills();
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
  const stopSession = useStopSession();

  // Auto-refresh list when session status changes (WebSocket)
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    };
    socket.on("session:status", handler);
    return () => { socket.off("session:status", handler); };
  }, [socket, queryClient]);

  // Fallback polling when sessions are CREATING (WebSocket may miss it)
  const hasCreatingSessions = sessions.some((s) => s.status === "CREATING");
  useEffect(() => {
    if (!hasCreatingSessions) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasCreatingSessions, queryClient]);

  const emptyForm = {
    name: "",
    projectId: "",
    repositoryIds: [] as string[],
    branch: "",
    integrationIds: [] as string[],
    aiCredentialId: "",
    startArguments: "",
    enableDocker: false,
    mountSsh: false,
    baseImageId: "",
    skillIds: [] as string[],
    instructions: "",
    localPath: "",
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
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
    if (defaultGithubId && form.integrationIds.length === 0) {
      setForm((prev) => ({
        ...prev,
        integrationIds: prev.integrationIds.length === 0
          ? [defaultGithubId]
          : prev.integrationIds,
      }));
    }
  }, [defaultGithubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open dialog when navigating with ?snapshot=id
  const [snapshotHandled, setSnapshotHandled] = useState(false);
  useEffect(() => {
    if (snapshotHandled || !urlSnapshotId || snapshotsList.length === 0) return;
    const snap = snapshotsList.find((s: { id: string; status: string }) => s.id === urlSnapshotId && s.status === "READY");
    if (snap) {
      setForm((prev) => ({
        ...prev,
        baseImageId: urlSnapshotId,
        name: `Thread from ${(snap as { name: string }).name}`,
        enableDocker: (snap as { enableDocker?: boolean }).enableDocker ?? prev.enableDocker,
      }));
      setIsDialogOpen(true);
      setSnapshotHandled(true);
    }
  }, [urlSnapshotId, snapshotsList, snapshotHandled]);

  // Auto-open dialog when navigating with ?newSession=1&taskName=...
  const [taskHandled, setTaskHandled] = useState(false);
  useEffect(() => {
    if (taskHandled || !urlNewSession) return;
    const autoSnapshot = readySnapshots.length === 1 ? readySnapshots[0].id : '';
    setForm((prev) => ({
      ...prev,
      name: urlTaskName || prev.name,
      instructions: urlTaskInstructions || prev.instructions,
      projectId: urlProjectId || prev.projectId,
      baseImageId: autoSnapshot || prev.baseImageId,
      integrationIds: defaultGithubId ? [defaultGithubId] : prev.integrationIds,
    }));
    setIsDialogOpen(true);
    setTaskHandled(true);
  }, [urlNewSession, urlTaskName, urlTaskInstructions, urlProjectId, defaultGithubId, taskHandled, readySnapshots]);

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
      name: session.name,
      projectId: session.projectId || "",
      repositoryIds:
        session.repositories?.map((r) => r.repositoryId) || [],
      branch: "",
      integrationIds:
        session.integrations?.map((i) => i.integrationId) || [],
      aiCredentialId: session.aiCredentialId || "",
      startArguments: session.startArguments || "",
      enableDocker: session.enableDocker,
      mountSsh: false,
      baseImageId: session.baseImageId || "",
      skillIds: [] as string[],
      instructions: session.instructions || "",
      localPath: "",
    };
    setEditingId(session.id);
    setEditingStatus(session.status);
    setOriginalForm(initial);
    setForm(initial);
    setIsDialogOpen(true);
  };

  const setEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sa = new Set(a);
    return b.every((x) => sa.has(x));
  };

  const metadataFields = ["name", "projectId", "instructions"] as const;
  const configFields = [
    "aiCredentialId",
    "startArguments",
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
    : "Start Thread";

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a thread name");
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
          startArguments: form.startArguments || undefined,
          enableDocker: form.enableDocker || undefined,
          baseImageId: form.baseImageId || undefined,
          skillIds: form.skillIds.length > 0 ? form.skillIds : undefined,
          instructions: form.instructions || undefined,
          branch: form.branch || undefined,
          localPath: form.localPath || undefined,
          mountSsh: form.mountSsh || undefined,
        });
        toast.success("Thread created");
        setIsDialogOpen(false);
        setForm({
          ...emptyForm,
          integrationIds: defaultGithubId ? [defaultGithubId] : [],
        });
        router.push(`/sessions/${session.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create thread";
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
        "Stop the thread first to reconfigure container settings",
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
            startArguments: form.startArguments,
            enableDocker: form.enableDocker,
            instructions: form.instructions,
          },
        });
        toast.success("Thread reconfigured — restarting container");
      } else {
        await updateSession.mutateAsync({
          id: editingId,
          data: {
            name: form.name,
            projectId: form.projectId,
            instructions: form.instructions,
          },
        });
        toast.success("Thread updated");
      }
      setIsDialogOpen(false);
      setEditingId(null);
      setEditingStatus(null);
      setOriginalForm(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save thread";
      toast.error(message);
    }
  };

  const handleEdit = (e: React.MouseEvent, session: AgentSession) => {
    e.stopPropagation();
    openEdit(session);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteSession.mutateAsync(deleteTarget.id);
      toast.success("Thread deleted");
    } catch {
      toast.error("Failed to delete thread");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await stopSession.mutateAsync(id);
      toast.success("Thread stopped");
    } catch {
      toast.error("Failed to stop thread");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const count = selectedIds.size;
    for (const id of selectedIds) {
      try { await deleteSession.mutateAsync(id); } catch { /* continue */ }
    }
    toast.success(`Deleted ${count} thread(s)`);
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkDeleteConfirm(false);
    setSelectMode(false);
  };

  const totalSessions = sessions.length;
  const runningSessions = sessions.filter((s) => s.status === "RUNNING").length;
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const failedSessions = sessions.filter((s) => s.status === "FAILED").length;

  const sessionProviders = aiCredentials.filter((c) =>
    ["CLAUDE_CODE_LOCAL", "OPENCLAW"].includes(c.provider),
  );
  const activeRepos = repositories.filter((r) => r.isActive);
  const firstSelectedRepoId = form.repositoryIds[0] || undefined;
  const { data: branches = [] } = useRepoBranches(firstSelectedRepoId);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Threads</h1>
          <p className="text-sm text-muted-foreground">
            Isolated environments for AI coding agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)} disabled={selectedIds.size === 0}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
            </>
          ) : (
            <>
              {sessions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectMode(true)}>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select threads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
              New Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Thread" : "New Thread"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? configLocked
                    ? "Stop the thread first to reconfigure container settings."
                    : "Configuration changes will restart the container."
                  : "Give it a name, pick an AI provider, and go."}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4 overflow-y-auto">
              <ThreadFormFields
                form={form}
                setForm={setForm}
                configLocked={configLocked}
                sessionProviders={sessionProviders}
                readySnapshots={readySnapshots}
                projects={projects}
                activeRepos={activeRepos}
                repoSearch={repoSearch}
                setRepoSearch={setRepoSearch}
                branches={branches}
                activeIntegrations={activeIntegrations}
                skillsList={skillsList}
              />
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
            </>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="COMPLETED">Stopped</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CREATING">Creating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-x-6 sm:gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4" />
          <span>Total</span>
          <span className="font-semibold text-foreground">{totalSessions}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Play className="h-4 w-4 text-green-500" />
          <span>Running</span>
          <span className="font-semibold text-foreground">{runningSessions}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <span>Stopped</span>
          <span className="font-semibold text-foreground">{completedSessions}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-400" />
          <span>Failed</span>
          <span className="font-semibold text-foreground">{failedSessions}</span>
        </div>
      </div>

      <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquareCode className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No threads yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                Threads are isolated containers where AI agents work on your code.
                Create your first thread or{" "}
                <Link href="/tasks" className="underline hover:text-foreground transition-colors">
                  import tasks from Jira
                </Link>{" "}
                to get started.
              </p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Thread
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectMode && (
                <div className="flex items-center gap-3 px-4 py-1">
                  <input type="checkbox" checked={selectedIds.size === filteredSessions.length && filteredSessions.length > 0} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                  <span className="text-xs text-muted-foreground">{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}</span>
                </div>
              )}
              {filteredSessions.map((session) => {
                const config = statusConfig[session.status as SessionStatus];
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => selectMode ? toggleSelect(session.id) : router.push(`/sessions/${session.id}`)}
                  >
                    {selectMode ? (
                      <input type="checkbox" checked={selectedIds.has(session.id)} onChange={() => toggleSelect(session.id)} onClick={(e) => e.stopPropagation()} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0" />
                    ) : (
                      <MessageSquareCode className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{session.name}</span>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                      {session.instructions && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {session.instructions.split('\n')[0]}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {session.project && <span>{session.project.name}</span>}
                        {session.aiCredential && <span>{providerLabels[session.aiCredential.provider] || session.aiCredential.provider}</span>}
                        {session.branch && (
                          <span className="flex items-center gap-1 font-mono">
                            <GitBranch className="w-3 h-3" />
                            {session.branch}
                          </span>
                        )}
                        {session.enableDocker && <span>Docker</span>}
                        {session.repositories && session.repositories.length > 0 && (
                          <span className="truncate max-w-[200px]">
                            {session.repositories.map((r) => r.repository?.name || "").filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(session.lastActiveAt))}
                        </span>
                      </div>
                    </div>

                    {!selectMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/sessions/${session.id}`)}>
                              <Play className="w-4 h-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            {session.status === "RUNNING" && (
                              <DropdownMenuItem onClick={(e) => handleStop(e as unknown as React.MouseEvent, session.id)}>
                                <Square className="w-4 h-4 mr-2" />
                                Stop
                              </DropdownMenuItem>
                            )}
                            {session.status !== "CREATING" && (
                              <DropdownMenuItem onClick={(e) => handleEdit(e as unknown as React.MouseEvent, session)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: session.id, name: session.name })}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete thread?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo; and its container. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deletingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} thread(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected threads and their containers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
