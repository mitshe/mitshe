"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Play,
  Eye,
  Trash2,
  ListTodo,
  Download,
  ExternalLink,
  Workflow,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  useTasks,
  useProjects,
  useWorkflows,
  useCreateTask,
  useProcessTask,
  useDeleteTask,
  useImportPreview,
  useImportConfirm,
  useRunWorkflowOnTask,
} from "@/lib/api/hooks";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Task, TaskPriority, JiraImportPreview } from "@/lib/api/types";
import {
  getTaskStatus,
  getPriority,
} from "@/lib/status-config";

const ITEMS_PER_PAGE = 15;

export default function TasksPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: workflows = [] } = useWorkflows();
  const createTask = useCreateTask();
  const processTask = useProcessTask();
  const deleteTask = useDeleteTask();
  const importPreview = useImportPreview();
  const importConfirm = useImportConfirm();
  const runWorkflowOnTask = useRunWorkflowOnTask();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState<"jira" | "youtrack" | null>(
    null,
  );
  const [importUrl, setImportUrl] = useState("");
  const [importProjectId, setImportProjectId] = useState("");
  const [preview, setPreview] = useState<JiraImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    projectId: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const searchParams = useSearchParams();
  const [filterProjectId, setFilterProjectId] = useState<string>(
    searchParams.get("projectId") || "all",
  );
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  type SortField = "title" | "project" | "status" | "priority" | "createdAt";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change (React "adjusting state during render" pattern)
  const filterFingerprint = `${debouncedSearchQuery}-${filterProjectId}-${filterPriority}-${filterStatus}`;
  const [prevFilterFingerprint, setPrevFilterFingerprint] =
    useState(filterFingerprint);
  if (prevFilterFingerprint !== filterFingerprint) {
    setPrevFilterFingerprint(filterFingerprint);
    setCurrentPage(1);
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const manualWorkflows = workflows.filter((w) => w.triggerType === "manual");
  const isLoading = tasksLoading || projectsLoading;

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (filterStatus !== "all") {
      result = result.filter((task) => task.status === filterStatus);
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query),
      );
    }

    if (filterProjectId !== "all") {
      result = result.filter((task) => task.projectId === filterProjectId);
    }

    if (filterPriority !== "all") {
      result = result.filter((task) => task.priority === filterPriority);
    }

    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const statusOrder: Record<string, number> = {
      IN_PROGRESS: 0,
      ANALYZING: 1,
      PENDING: 2,
      REVIEW: 3,
      COMPLETED: 4,
      FAILED: 5,
      CANCELLED: 6,
    };

    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "project":
          comparison = (a.project?.name || "").localeCompare(
            b.project?.name || "",
          );
          break;
        case "status":
          comparison =
            (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        case "priority":
          comparison =
            (priorityOrder[a.priority || ""] ?? 99) -
            (priorityOrder[b.priority || ""] ?? 99);
          break;
        case "createdAt":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    tasks,
    filterStatus,
    debouncedSearchQuery,
    filterProjectId,
    filterPriority,
    sortField,
    sortDirection,
  ]);

  const hasActiveFilters =
    searchQuery ||
    filterProjectId !== "all" ||
    filterPriority !== "all" ||
    filterStatus !== "all";

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const clearFilters = () => {
    setSearchQuery("");
    setFilterProjectId("all");
    setFilterPriority("all");
    setFilterStatus("all");
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        projectId: newTask.projectId || undefined,
      });
      setCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        projectId: "",
      });
    } catch {
      toast.error("Failed to create task");
    }
  };

  const handleProcessTask = async (taskId: string) => {
    try {
      await processTask.mutateAsync(taskId);
    } catch {
      toast.error("Failed to process task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleImportPreview = async () => {
    if (!importUrl.trim()) return;
    setImportError(null);
    setPreview(null);

    try {
      const result = await importPreview.mutateAsync({ url: importUrl });
      setPreview(result);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to fetch issue preview",
      );
    }
  };

  const handleImportConfirm = async () => {
    if (!importUrl.trim()) return;
    setImportError(null);

    try {
      await importConfirm.mutateAsync({
        url: importUrl,
        projectId: importProjectId || undefined,
      });
      setImportDialogOpen(false);
      setImportUrl("");
      setImportProjectId("");
      setPreview(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Failed to import issue",
      );
    }
  };

  const handleRunWorkflow = async (taskId: string, workflowId: string) => {
    try {
      await runWorkflowOnTask.mutateAsync({
        taskId,
        data: { workflowId },
      });
    } catch {
      toast.error("Failed to run workflow");
    }
  };

  const resetImportDialog = () => {
    setImportSource(null);
    setImportUrl("");
    setImportProjectId("");
    setPreview(null);
    setImportError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTaskTable = (taskList: Task[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => handleSort("title")}
            >
              Title
              <SortIcon field="title" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => handleSort("project")}
            >
              Project
              <SortIcon field="project" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => handleSort("status")}
            >
              Status
              <SortIcon field="status" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => handleSort("priority")}
            >
              Priority
              <SortIcon field="priority" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => handleSort("createdAt")}
            >
              Created
              <SortIcon field="createdAt" />
            </Button>
          </TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taskList.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">
              <Link href={`/tasks/${task.id}`} className="hover:underline">
                {task.title}
              </Link>
            </TableCell>
            <TableCell>
              {task.project ? (
                <Link
                  href={`/projects/${task.projectId}`}
                  className="hover:underline text-muted-foreground"
                >
                  {task.project.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Badge variant={getTaskStatus(task.status).variant}>
                  {getTaskStatus(task.status).label}
                </Badge>
                {task.externalStatus && (
                  <Badge variant="secondary" className="text-xs">
                    {task.externalStatus}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              {task.priority ? (
                <Badge variant={getPriority(task.priority).variant}>
                  {getPriority(task.priority).label}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(task.createdAt))}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/tasks/${task.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  {task.status === "PENDING" && (
                    <DropdownMenuItem
                      onClick={() => handleProcessTask(task.id)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Process with AI
                    </DropdownMenuItem>
                  )}
                  {manualWorkflows.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Workflow className="mr-2 h-4 w-4" />
                        Run Workflow
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {manualWorkflows.map((workflow) => (
                            <DropdownMenuItem
                              key={workflow.id}
                              onClick={() =>
                                handleRunWorkflow(task.id, workflow.id)
                              }
                            >
                              {workflow.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  )}
                  {task.externalSource && (
                    <DropdownMenuItem asChild>
                      <a
                        href={task.externalIssueUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View in {task.externalSource}
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12 text-muted-foreground">
      <ListTodo className="w-12 h-12 mx-auto mb-4" />
      <p className="mb-4">
        {hasActiveFilters
          ? "No tasks match your filters"
          : "No tasks yet. Create your first task to get started."}
      </p>
      {hasActiveFilters ? (
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create a task
            </Button>
          </DialogTrigger>
        </Dialog>
      )}
    </div>
  );

  const renderTaskCard = (task: Task) => (
    <div
      key={task.id}
      className="flex flex-col gap-3 p-4 border rounded-lg bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${task.id}`}
          className="font-medium hover:underline line-clamp-2 flex-1"
        >
          {task.title}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/tasks/${task.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {task.status === "PENDING" && (
              <DropdownMenuItem onClick={() => handleProcessTask(task.id)}>
                <Play className="mr-2 h-4 w-4" />
                Process with AI
              </DropdownMenuItem>
            )}
            {task.externalSource && (
              <DropdownMenuItem asChild>
                <a
                  href={task.externalIssueUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in {task.externalSource}
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDeleteTask(task.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={getTaskStatus(task.status).variant}>
          {getTaskStatus(task.status).label}
        </Badge>
        {task.priority && (
          <Badge variant={getPriority(task.priority).variant}>
            {getPriority(task.priority).label}
          </Badge>
        )}
        {task.externalStatus && (
          <Badge variant="secondary" className="text-xs">
            {task.externalStatus}
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {task.project ? (
          <Link
            href={`/projects/${task.projectId}`}
            className="hover:underline truncate"
          >
            {task.project.name}
          </Link>
        ) : (
          <span>No project</span>
        )}
        <span className="shrink-0">
          {formatDistanceToNow(new Date(task.createdAt))}
        </span>
      </div>
    </div>
  );

  const renderMobileTaskList = (taskList: Task[]) => (
    <div className="space-y-3">{taskList.map(renderTaskCard)}</div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor AI-processed tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={importDialogOpen}
            onOpenChange={(open) => {
              setImportDialogOpen(open);
              if (!open) resetImportDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {importSource
                    ? `Import from ${importSource === "jira" ? "Jira" : "YouTrack"}`
                    : "Import Task"}
                </DialogTitle>
                <DialogDescription>
                  {importSource
                    ? `Paste a ${importSource === "jira" ? "Jira" : "YouTrack"} issue URL to import it as a task.`
                    : "Choose an issue tracker to import from."}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4 py-4">
                {!importSource ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setImportSource("jira")}
                      className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        J
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Jira</div>
                        <div className="text-xs text-muted-foreground">
                          Atlassian Jira Cloud or Server
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setImportSource("youtrack")}
                      className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        Y
                      </div>
                      <div className="text-center">
                        <div className="font-medium">YouTrack</div>
                        <div className="text-xs text-muted-foreground">
                          JetBrains YouTrack
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit -mt-2"
                      onClick={() => {
                        setImportSource(null);
                        setImportUrl("");
                        setPreview(null);
                        setImportError(null);
                      }}
                    >
                      ← Back to sources
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor="issue-url">Issue URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="issue-url"
                          placeholder={
                            importSource === "jira"
                              ? "https://yourcompany.atlassian.net/browse/PROJ-123"
                              : "https://youtrack.yourcompany.com/issue/PROJ-123"
                          }
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleImportPreview();
                          }}
                        />
                        <Button
                          variant="secondary"
                          onClick={handleImportPreview}
                          disabled={
                            importPreview.isPending || !importUrl.trim()
                          }
                        >
                          {importPreview.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {importError && (
                  <Alert variant="destructive">
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}

                {preview && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{preview.issueKey}</Badge>
                          <Badge variant="secondary">{preview.issueType}</Badge>
                          {preview.priority && (
                            <Badge variant="outline">{preview.priority}</Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold">
                          {preview.title}
                        </h3>
                      </div>
                      <Badge>{preview.status}</Badge>
                    </div>

                    {preview.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {preview.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Project: </span>
                        <span className="font-medium">
                          {preview.project.name} ({preview.project.key})
                        </span>
                      </div>
                      {preview.assignee && (
                        <div>
                          <span className="text-muted-foreground">
                            Assignee:{" "}
                          </span>
                          <span className="font-medium">
                            {preview.assignee}
                          </span>
                        </div>
                      )}
                      {preview.labels.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Labels:{" "}
                          </span>
                          {preview.labels.map((label) => (
                            <Badge
                              key={label}
                              variant="outline"
                              className="ml-1"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {preview.components.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Components:{" "}
                          </span>
                          {preview.components.map((comp) => (
                            <Badge
                              key={comp.id}
                              variant="secondary"
                              className="ml-1"
                            >
                              {comp.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <Label htmlFor="import-project">
                        Assign to Project (optional)
                      </Label>
                      <Select
                        value={importProjectId}
                        onValueChange={setImportProjectId}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportDialogOpen(false);
                    resetImportDialog();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportConfirm}
                  disabled={!preview || importConfirm.isPending}
                >
                  {importConfirm.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import Task
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to be processed by AI agents.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the task..."
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: TaskPriority) =>
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={newTask.projectId}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, projectId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ANALYZING">Analyzing</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REVIEW">Review</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-x-6 sm:gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ListTodo className="h-4 w-4" />
          <span>Total</span>
          <span className="font-semibold text-foreground">
            {filteredTasks.length}
          </span>
          {hasActiveFilters && (
            <span className="text-xs">of {tasks.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="hidden sm:inline">Completed</span>
          <span className="sm:hidden">Done</span>
          <span className="font-semibold text-foreground">
            {tasks.filter((t) => t.status === "COMPLETED").length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="hidden sm:inline">In Progress</span>
          <span className="sm:hidden">Active</span>
          <span className="font-semibold text-foreground">
            {
              tasks.filter(
                (t) => t.status === "IN_PROGRESS" || t.status === "ANALYZING",
              ).length
            }
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Pending</span>
          <span className="font-semibold text-foreground">
            {tasks.filter((t) => t.status === "PENDING").length}
          </span>
        </div>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden">
        {filteredTasks.length === 0
          ? renderEmptyState()
          : renderMobileTaskList(paginatedTasks)}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
          {filteredTasks.length === 0
            ? renderEmptyState()
            : renderTaskTable(paginatedTasks)}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
