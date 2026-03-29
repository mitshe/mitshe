"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  FolderOpen,
  Clock,
  Play,
  MoreVertical,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useProcessTask,
  useWorkflows,
  useRunWorkflowOnTask,
  useRefreshExternalData,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import { TaskStatus, TaskPriority } from "@/lib/api/types";
import {
  taskStatusConfig,
  getTaskStatus,
  priorityConfig,
  getPriority,
} from "@/lib/status-config";

function ExternalDataDisplay({
  data,
  issueId,
  externalStatus,
}: {
  data: Record<string, unknown>;
  issueId?: string | null;
  externalStatus?: string | null;
}) {
  const issueType = typeof data.issueType === "string" ? data.issueType : null;
  const labels = Array.isArray(data.labels)
    ? data.labels.filter((l): l is string => typeof l === "string")
    : [];
  const components = Array.isArray(data.components)
    ? data.components.filter(
        (c): c is { name: string } =>
          typeof c === "object" && c !== null && "name" in c,
      )
    : [];

  return (
    <div className="space-y-3">
      {issueId && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Issue ID:</span>
          <Badge variant="outline">{issueId}</Badge>
        </div>
      )}
      {externalStatus && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Status:</span>
          <Badge variant="secondary">{externalStatus}</Badge>
        </div>
      )}
      {issueType && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Type:</span>
          <span className="text-sm text-muted-foreground">{issueType}</span>
        </div>
      )}
      {labels.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Labels:</span>
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {components.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Components:</span>
          <div className="flex flex-wrap gap-1">
            {components.map((comp) => (
              <Badge key={comp.name} variant="outline" className="text-xs">
                {comp.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const { data: task, isLoading, error } = useTask(taskId);
  const { data: workflows = [] } = useWorkflows();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const processTask = useProcessTask();
  const runWorkflow = useRunWorkflowOnTask();
  const refreshExternalData = useRefreshExternalData();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "medium" as TaskPriority,
  });

  const activeWorkflows = workflows.filter((w) => w.isActive);

  const handleEditOpen = (open: boolean) => {
    if (open && task) {
      setEditForm({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "medium",
      });
    }
    setIsEditOpen(open);
  };

  const handleUpdateTask = async () => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: {
          title: editForm.title,
          description: editForm.description || undefined,
          status: editForm.status,
          priority: editForm.priority,
        },
      });
      toast.success("Task updated successfully");
      setIsEditOpen(false);
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Task deleted");
      router.push("/tasks");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleProcessTask = async () => {
    try {
      await processTask.mutateAsync(taskId);
      toast.success("Task processing started");
    } catch {
      toast.error("Failed to process task");
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      await runWorkflow.mutateAsync({ taskId, data: { workflowId } });
      toast.success("Workflow started");
    } catch {
      toast.error("Failed to run workflow");
    }
  };

  const handleRefreshExternalData = async () => {
    try {
      await refreshExternalData.mutateAsync(taskId);
      toast.success("External data refreshed");
    } catch {
      toast.error("Failed to refresh external data");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-red-500 mb-2">Task not found</p>
        <Link href="/tasks">
          <Button variant="outline">Back to Tasks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/tasks">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Badge variant={getTaskStatus(task.status).variant}>
              {getTaskStatus(task.status).label}
            </Badge>
            {task.priority && (
              <Badge variant={getPriority(task.priority).variant}>
                {getPriority(task.priority).label}
              </Badge>
            )}
            {task.externalSource && (
              <Badge variant="outline" className="gap-1">
                <ExternalLink className="w-3 h-3" />
                {task.externalSource}
              </Badge>
            )}
            {task.externalStatus && (
              <Badge variant="secondary" className="gap-1">
                {task.externalStatus}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold break-words">{task.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={isEditOpen} onOpenChange={handleEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>Update task details</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value: TaskStatus) =>
                        setEditForm({ ...editForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(taskStatusConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={editForm.priority}
                      onValueChange={(value: TaskPriority) =>
                        setEditForm({ ...editForm, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(
                          ([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateTask}
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleProcessTask}
                disabled={processTask.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Process with AI
              </DropdownMenuItem>
              {activeWorkflows.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Play className="w-4 h-4 mr-2" />
                    Run Workflow
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {activeWorkflows.map((workflow) => (
                      <DropdownMenuItem
                        key={workflow.id}
                        onClick={() => handleRunWorkflow(workflow.id)}
                      >
                        {workflow.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {task.externalSource && (
                <DropdownMenuItem
                  onClick={handleRefreshExternalData}
                  disabled={refreshExternalData.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh External Data
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteTask}
                className="text-red-600"
                disabled={deleteTask.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b pb-4">
        {task.project && (
          <Link
            href={`/projects/${task.project.id}`}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <FolderOpen className="w-4 h-4" />
            {task.project.name}
          </Link>
        )}
        {task.assigneeId && (
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {task.assigneeId}
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          Created {formatDistanceToNow(new Date(task.createdAt))}
        </div>
        {task.externalIssueUrl && (
          <a
            href={task.externalIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
            {task.externalIssueId || task.externalSource}
          </a>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Description
        </h2>
        {task.description ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-foreground">
              {task.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description provided
          </p>
        )}
      </div>

      {task.externalSource && task.externalData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">External Source</CardTitle>
              {task.externalIssueUrl && (
                <a
                  href={task.externalIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ExternalDataDisplay
              data={task.externalData}
              issueId={task.externalIssueId}
              externalStatus={task.externalStatus}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
