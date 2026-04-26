"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Trash2,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Workflow as WorkflowIcon,
  History,
  Code2,
  GitPullRequest,
  MessageSquare,
  FileText,
  Sparkles,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";
import {
  useWorkflows,
  useProjects,
  useCreateWorkflow,
  useActivateWorkflow,
  useDeactivateWorkflow,
  useDeleteWorkflow,
  useRunWorkflow,
  useWorkflowTemplates,
  useCreateWorkflowFromTemplate,
} from "@/lib/api/hooks";
import { Pagination } from "@/components/ui/pagination";
import type { WorkflowTemplateMetadata } from "@/lib/api/types";

const ITEMS_PER_PAGE = 10;

const triggerTypeLabels: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-blue-500/10 text-blue-600" },
  schedule: { label: "Scheduled", color: "bg-purple-500/10 text-purple-600" },
  webhook: { label: "Webhook", color: "bg-orange-500/10 text-orange-600" },
  event: { label: "Event", color: "bg-green-500/10 text-green-600" },
  jira_issue: { label: "JIRA Issue", color: "bg-blue-500/10 text-blue-600" },
  jira_component_added: {
    label: "JIRA Component",
    color: "bg-blue-500/10 text-blue-600",
  },
  jira_label_added: {
    label: "JIRA Label",
    color: "bg-blue-500/10 text-blue-600",
  },
  git_push: { label: "Git Push", color: "bg-orange-500/10 text-orange-600" },
  git_mr: { label: "Merge Request", color: "bg-orange-500/10 text-orange-600" },
};

const categoryStyles: Record<string, { icon: React.ReactNode; color: string }> =
  {
    "AI Development": {
      icon: <Sparkles className="w-5 h-5" />,
      color: "bg-purple-500",
    },
    "Code Review": {
      icon: <Code2 className="w-5 h-5" />,
      color: "bg-blue-500",
    },
    "Git Automation": {
      icon: <GitPullRequest className="w-5 h-5" />,
      color: "bg-green-500",
    },
    Notifications: {
      icon: <MessageSquare className="w-5 h-5" />,
      color: "bg-orange-500",
    },
    Documentation: {
      icon: <FileText className="w-5 h-5" />,
      color: "bg-yellow-500",
    },
  };

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: workflows = [], isLoading } = useWorkflows();
  const { data: projects = [] } = useProjects();
  const { data: templates = [], isLoading: templatesLoading } =
    useWorkflowTemplates();
  const createWorkflow = useCreateWorkflow();
  const createFromTemplate = useCreateWorkflowFromTemplate();
  const activateWorkflow = useActivateWorkflow();
  const deactivateWorkflow = useDeactivateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const runWorkflow = useRunWorkflow();

  const [search, setSearch] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    projectId: "",
  });

  // Filter workflows by search + trigger + status
  const filteredWorkflows = workflows.filter((w) => {
    if (search) {
      const s = search.toLowerCase();
      if (!String(w.name || "").toLowerCase().includes(s) && !String(w.description || "").toLowerCase().includes(s)) return false;
    }
    if (filterTrigger !== "all" && w.triggerType !== filterTrigger) return false;
    if (filterActive === "active" && !w.isActive) return false;
    if (filterActive === "inactive" && w.isActive) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredWorkflows.length / ITEMS_PER_PAGE);
  const paginatedWorkflows = filteredWorkflows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;

    try {
      let result;

      if (selectedTemplate) {
        result = await createFromTemplate.mutateAsync({
          templateId: selectedTemplate.id,
          name: newWorkflow.name,
          description: newWorkflow.description || undefined,
          projectId: newWorkflow.projectId || undefined,
        });
      } else {
        result = await createWorkflow.mutateAsync({
          name: newWorkflow.name,
          description: newWorkflow.description || undefined,
          projectId: newWorkflow.projectId || undefined,
        });
      }

      setCreateDialogOpen(false);
      setCreateMode("blank");
      setSelectedTemplate(null);
      setNewWorkflow({
        name: "",
        description: "",
        projectId: "",
      });
      router.push(`/workflows/${result.id}/edit`);
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  const handleToggleActive = async (workflowId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateWorkflow.mutateAsync(workflowId);
      } else {
        await activateWorkflow.mutateAsync(workflowId);
      }
    } catch {
      toast.error("Failed to update workflow status");
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow.mutateAsync(workflowId);
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const result = await runWorkflow.mutateAsync({ id: workflowId });
      toast.success("Workflow started", {
        description: "Execution is now running",
        action: {
          label: "View execution",
          onClick: () =>
            router.push(
              `/workflows/${workflowId}/executions/${result.executionId}`,
            ),
        },
      });
    } catch {
      toast.error("Failed to run workflow");
    }
  };

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const inactiveWorkflows = workflows.filter((w) => !w.isActive).length;
  const totalExecutions = workflows.reduce(
    (acc, w) => acc + (w._count?.executions || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage automated workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setCreateMode("blank");
              setSelectedTemplate(null);
              setNewWorkflow({ name: "", description: "", projectId: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate
                  ? `Create from Template: ${selectedTemplate.name}`
                  : "Create New Workflow"}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate
                  ? selectedTemplate.description
                  : "Create a blank workflow or start from a template."}
              </DialogDescription>
            </DialogHeader>

            {!selectedTemplate && (
              <div className="flex gap-2 border-b pb-4">
                <Button
                  variant={createMode === "blank" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreateMode("blank")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Blank Workflow
                </Button>
                <Button
                  variant={createMode === "template" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreateMode("template")}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  From Template
                </Button>
              </div>
            )}

            {createMode === "template" && !selectedTemplate && (
              <DialogBody className="py-4">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates available
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-1">
                    {templates.map((template) => {
                      const style = categoryStyles[template.category] || {
                        icon: <WorkflowIcon className="w-5 h-5" />,
                        color: "bg-gray-500",
                      };
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setNewWorkflow({
                              ...newWorkflow,
                              name: template.name,
                              description: template.description,
                            });
                          }}
                          className="flex flex-col items-start p-4 rounded-lg border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left"
                        >
                          <div
                            className={`w-10 h-10 rounded-lg ${style.color} flex items-center justify-center text-white mb-3`}
                          >
                            {style.icon}
                          </div>
                          <h5 className="font-medium mb-1">{template.name}</h5>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {template.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </DialogBody>
            )}

            {(createMode === "blank" || selectedTemplate) && (
              <>
                {selectedTemplate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setNewWorkflow({
                        name: "",
                        description: "",
                        projectId: "",
                      });
                    }}
                  >
                    ← Back to templates
                  </Button>
                )}
                <DialogBody className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Workflow name"
                      value={newWorkflow.name}
                      onChange={(e) =>
                        setNewWorkflow({ ...newWorkflow, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the workflow..."
                      value={newWorkflow.description}
                      onChange={(e) =>
                        setNewWorkflow({
                          ...newWorkflow,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project (optional)</Label>
                    <Select
                      value={newWorkflow.projectId}
                      onValueChange={(value) =>
                        setNewWorkflow({ ...newWorkflow, projectId: value })
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
                </DialogBody>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWorkflow}
                    disabled={
                      createWorkflow.isPending || createFromTemplate.isPending
                    }
                  >
                    {createWorkflow.isPending ||
                    createFromTemplate.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Workflow"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterTrigger} onValueChange={(v) => { setFilterTrigger(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Triggers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4" />
          <span>Total</span>
          <span className="font-semibold text-foreground">
            {totalWorkflows}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Active</span>
          <span className="font-semibold text-foreground">
            {activeWorkflows}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4" />
          <span>Inactive</span>
          <span className="font-semibold text-foreground">
            {inactiveWorkflows}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>Executions</span>
          <span className="font-semibold text-foreground">
            {totalExecutions}
          </span>
        </div>
      </div>

      <div>
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <WorkflowIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Create your first workflow
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Automate your development process with custom workflows. Start
                from a template or build from scratch.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Workflow
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/workflows/${workflow.id}/edit`}
                          className="font-medium hover:underline block truncate"
                        >
                          {workflow.name}
                        </Link>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/workflows/${workflow.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/workflows/${workflow.id}/executions`}>
                              <History className="w-4 h-4 mr-2" />
                              History
                            </Link>
                          </DropdownMenuItem>
                          {workflow.triggerType === "manual" && (
                            <DropdownMenuItem
                              onClick={() => handleRunWorkflow(workflow.id)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                          )}
                          {workflow.triggerType !== "manual" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleActive(
                                  workflow.id,
                                  workflow.isActive,
                                )
                              }
                            >
                              {workflow.isActive ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {workflow.triggerType === "manual" ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-600"
                        >
                          Ready
                        </Badge>
                      ) : (
                        <Badge
                          variant={workflow.isActive ? "default" : "secondary"}
                          className={
                            workflow.isActive
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          triggerTypeLabels[workflow.triggerType]?.color
                        }
                      >
                        {triggerTypeLabels[workflow.triggerType]?.label ||
                          workflow.triggerType}
                      </Badge>
                    </div>

                    {workflow.project && (
                      <div className="text-sm text-muted-foreground">
                        Project: {workflow.project.name}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <History className="h-3.5 w-3.5" />
                          <span>{workflow._count?.executions || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {formatDistanceToNow(new Date(workflow.updatedAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executions</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedWorkflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/workflows/${workflow.id}/edit`}
                              className="font-medium hover:underline"
                            >
                              {workflow.name}
                            </Link>
                            {workflow.description && (
                              <p
                                className="text-sm text-muted-foreground"
                                title={workflow.description}
                              >
                                {workflow.description.length > 30
                                  ? `${workflow.description.slice(0, 30)}...`
                                  : workflow.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              triggerTypeLabels[workflow.triggerType]?.color
                            }
                          >
                            {triggerTypeLabels[workflow.triggerType]?.label ||
                              workflow.triggerType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {workflow.triggerType === "manual" ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-600"
                            >
                              Ready
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                workflow.isActive ? "default" : "secondary"
                              }
                              className={
                                workflow.isActive
                                  ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                  : ""
                              }
                            >
                              {workflow.isActive ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {workflow._count?.executions || 0}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(workflow.updatedAt))}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/workflows/${workflow.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/workflows/${workflow.id}/executions`}
                                >
                                  <History className="w-4 h-4 mr-2" />
                                  History
                                </Link>
                              </DropdownMenuItem>
                              {workflow.triggerType === "manual" && (
                                <DropdownMenuItem
                                  onClick={() => handleRunWorkflow(workflow.id)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Run Now
                                </DropdownMenuItem>
                              )}
                              {workflow.triggerType !== "manual" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleActive(
                                      workflow.id,
                                      workflow.isActive,
                                    )
                                  }
                                >
                                  {workflow.isActive ? (
                                    <>
                                      <Pause className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleDeleteWorkflow(workflow.id)
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={workflows.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
      </div>
    </div>
  );
}
