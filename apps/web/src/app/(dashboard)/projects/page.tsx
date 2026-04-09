"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FolderKanban,
  ListTodo,
  Workflow,
  MessageSquareCode,
  Settings,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from "@/lib/api/hooks";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

export default function ProjectsPage() {
  const { data: projects = [], isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newProject, setNewProject] = useState({
    name: "",
    key: "",
    description: "",
  });

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const paginatedProjects = projects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCreateProject = async () => {
    try {
      await createProject.mutateAsync({
        name: newProject.name,
        key: newProject.key,
        description: newProject.description || undefined,
      });
      toast.success("Project created successfully");
      setIsCreateOpen(false);
      setNewProject({ name: "", key: "", description: "" });
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id);
      toast.success("Project deleted successfully");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-2">Failed to load projects</p>
        <p className="text-sm text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const totalTasks = projects.reduce(
    (acc, p) => acc + (p._count?.tasks || 0),
    0,
  );
  const totalWorkflows = projects.reduce(
    (acc, p) => acc + (p._count?.workflows || 0),
    0,
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Organize tasks and workflows by project
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Add a new project to organize your tasks and workflows.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My Project"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Project Key</Label>
                <Input
                  id="key"
                  placeholder="PROJ"
                  maxLength={10}
                  value={newProject.key}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      key: e.target.value.toUpperCase(),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  A short identifier for the project (e.g., PROJ, API, WEB)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description..."
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={
                  !newProject.name || !newProject.key || createProject.isPending
                }
              >
                {createProject.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FolderKanban className="h-4 w-4" />
          <span>Projects</span>
          <span className="font-semibold text-foreground">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ListTodo className="h-4 w-4" />
          <span>Tasks</span>
          <span className="font-semibold text-foreground">{totalTasks}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings className="h-4 w-4" />
          <span>Workflows</span>
          <span className="font-semibold text-foreground">
            {totalWorkflows}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>A list of all your projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first project to get started
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline block truncate"
                        >
                          {project.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {project.key}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks?projectId=${project.id}`}>
                              <ListTodo className="w-4 h-4 mr-2" />
                              Tasks
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/workflows?projectId=${project.id}`}>
                              <Workflow className="w-4 h-4 mr-2" />
                              Workflows
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/sessions?projectId=${project.id}`}>
                              <MessageSquareCode className="w-4 h-4 mr-2" />
                              Sessions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <ListTodo className="h-4 w-4" />
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Settings className="h-4 w-4" />
                        <span>{project._count?.workflows || 0} workflows</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(project.updatedAt))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Workflows</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium hover:underline"
                            >
                              {project.name}
                            </Link>
                            {project.description && (
                              <p className="text-sm text-muted-foreground">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.key}</Badge>
                        </TableCell>
                        <TableCell>{project._count?.tasks || 0}</TableCell>
                        <TableCell>{project._count?.workflows || 0}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(project.updatedAt))}
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
                                <Link href={`/projects/${project.id}`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/tasks?projectId=${project.id}`}>
                                  <ListTodo className="w-4 h-4 mr-2" />
                                  Tasks
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/workflows?projectId=${project.id}`}>
                                  <Workflow className="w-4 h-4 mr-2" />
                                  Workflows
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/sessions?projectId=${project.id}`}>
                                  <MessageSquareCode className="w-4 h-4 mr-2" />
                                  Sessions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteProject(project.id)}
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
                totalItems={projects.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
