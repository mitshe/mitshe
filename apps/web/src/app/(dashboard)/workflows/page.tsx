"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { getExecutionStatus, triggerTypeLabels } from "@/lib/status-config";
import { toast } from "sonner";
import {
  useWorkflows,
  useActivateWorkflow,
  useDeactivateWorkflow,
  useDeleteWorkflow,
  useRunWorkflow,
} from "@/lib/api/hooks";
import { Pagination } from "@/components/ui/pagination";
import { CreateWorkflowDialog } from "./components/create-workflow-dialog";
import { RunWorkflowDialog } from "./components/run-workflow-dialog";

const ITEMS_PER_PAGE = 10;

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: workflows = [], isLoading } = useWorkflows();
  const activateWorkflow = useActivateWorkflow();
  const deactivateWorkflow = useDeactivateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const runWorkflow = useRunWorkflow();

  const [search, setSearch] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [runTarget, setRunTarget] = useState<string | null>(null);

  type SortField = "name" | "triggerType" | "isActive" | "executions" | "updatedAt";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

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

  const sortedWorkflows = useMemo(() => {
    return [...filteredWorkflows].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "triggerType":
          comparison = (a.triggerType || "").localeCompare(b.triggerType || "");
          break;
        case "isActive":
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        case "executions":
          comparison = (a._count?.executions || 0) - (b._count?.executions || 0);
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredWorkflows, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedWorkflows.length / ITEMS_PER_PAGE);
  const paginatedWorkflows = sortedWorkflows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleToggleActive = async (workflowId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateWorkflow.mutateAsync(workflowId);
      } else {
        await activateWorkflow.mutateAsync(workflowId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update workflow status";
      toast.error(message);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow.mutateAsync(workflowId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete workflow";
      toast.error(message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (workflow?.triggerType === "task") {
      setRunTarget(workflowId);
      return;
    }

    try {
      const result = await runWorkflow.mutateAsync({ id: workflowId });
      toast.success("Workflow started", {
        action: {
          label: "View execution",
          onClick: () =>
            router.push(
              `/workflows/${workflowId}/executions/${result.executionId}`,
            ),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run workflow";
      toast.error(message);
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
          <CreateWorkflowDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreated={(id) => router.push(`/workflows/${id}/edit`)}
          />
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
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-x-6 sm:gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4" />
          <span>Total</span>
          <span className="font-semibold text-foreground">{totalWorkflows}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Active</span>
          <span className="font-semibold text-foreground">{activeWorkflows}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-400" />
          <span>Inactive</span>
          <span className="font-semibold text-foreground">{inactiveWorkflows}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-blue-500" />
          <span>Executions</span>
          <span className="font-semibold text-foreground">{totalExecutions}</span>
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
                            <MoreHorizontal className="w-4 h-4" />
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
                          {(workflow.triggerType === "manual" || workflow.triggerType === "task") && (
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
                            onClick={() => setDeleteTarget(workflow.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(workflow.triggerType === "manual" || workflow.triggerType === "task") ? (
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
                        <Link
                          href={`/workflows/${workflow.id}/executions`}
                          className="flex items-center gap-1.5 hover:underline hover:text-foreground"
                        >
                          {(() => {
                            const last = workflow.executions?.[0];
                            if (last) {
                              const st = getExecutionStatus(last.status);
                              return (
                                <Badge variant="outline" className={`gap-0.5 text-[10px] px-1.5 py-0 ${st.color}`}>
                                  {st.icon}
                                  {st.label}
                                </Badge>
                              );
                            }
                            return <History className="h-3.5 w-3.5" />;
                          })()}
                          <span>{workflow._count?.executions || 0} runs</span>
                        </Link>
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
                      <TableHead>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => handleSort("name")}>
                          Name
                          {getSortIcon("name")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => handleSort("triggerType")}>
                          Trigger
                          {getSortIcon("triggerType")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => handleSort("isActive")}>
                          Status
                          {getSortIcon("isActive")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => handleSort("executions")}>
                          Executions
                          {getSortIcon("executions")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => handleSort("updatedAt")}>
                          Last Updated
                          {getSortIcon("updatedAt")}
                        </Button>
                      </TableHead>
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
                              <p className="text-xs text-muted-foreground truncate max-w-md">
                                {workflow.description}
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
                          {(workflow.triggerType === "manual" || workflow.triggerType === "task") ? (
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
                          <Link
                            href={`/workflows/${workflow.id}/executions`}
                            className="flex items-center gap-2 hover:underline text-muted-foreground hover:text-foreground"
                          >
                            {(() => {
                              const last = workflow.executions?.[0];
                              if (last) {
                                const st = getExecutionStatus(last.status);
                                return (
                                  <Badge variant="outline" className={`gap-1 ${st.color}`}>
                                    {st.icon}
                                    {st.label}
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                            <span className="text-xs">{workflow._count?.executions || 0} runs</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(workflow.updatedAt))}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
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
                              {(workflow.triggerType === "manual" || workflow.triggerType === "task") && (
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
                                onClick={() => setDeleteTarget(workflow.id)}
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
                totalItems={sortedWorkflows.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkflow.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteWorkflow(deleteTarget)}
              disabled={deleteWorkflow.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkflow.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleteWorkflow.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RunWorkflowDialog
        workflowId={runTarget}
        onClose={() => setRunTarget(null)}
        onRun={(wfId, execId) => {
          toast.success("Workflow started", {
            action: {
              label: "View execution",
              onClick: () =>
                router.push(`/workflows/${wfId}/executions/${execId}`),
            },
          });
        }}
      />
    </div>
  );
}
