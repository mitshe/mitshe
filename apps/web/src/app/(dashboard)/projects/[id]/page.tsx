"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  ListTodo,
  Loader,
  Plus,
  Settings,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useTasks,
  useWorkflows,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import { getTaskStatus, getPriority } from "@/lib/status-config";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    data: project,
    isLoading: projectLoading,
    error,
  } = useProject(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const { data: workflows = [] } = useWorkflows(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    key: "",
  });

  const handleEditOpen = (open: boolean) => {
    if (open && project) {
      setEditForm({
        name: project.name,
        description: project.description || "",
        key: project.key,
      });
    }
    setIsEditOpen(open);
  };

  const handleUpdateProject = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          name: editForm.name,
          description: editForm.description || undefined,
          key: editForm.key,
        },
      });
      toast.success("Project updated successfully");
      setIsEditOpen(false);
    } catch {
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-2">Project not found</p>
        <Link href="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Badge variant="outline" className="text-sm">
              {project.key}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Dialog open={isEditOpen} onOpenChange={handleEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Project Key</Label>
                <Input
                  id="key"
                  value={editForm.key}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      key: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProject}
                disabled={updateProject.isPending}
              >
                {updateProject.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ListTodo className="h-4 w-4" />
          <span>Tasks</span>
          <span className="font-semibold text-foreground">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Loader className="h-4 w-4" />
          <span>In Progress</span>
          <span className="font-semibold text-foreground">
            {
              tasks.filter(
                (t) => t.status === "IN_PROGRESS" || t.status === "ANALYZING",
              ).length
            }
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          <span>Completed</span>
          <span className="font-semibold text-foreground">
            {tasks.filter((t) => t.status === "COMPLETED").length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings className="h-4 w-4" />
          <span>Active Workflows</span>
          <span className="font-semibold text-foreground">
            {workflows.filter((w) => w.isActive).length}
          </span>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Project Tasks</h2>
            <Link href="/tasks">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tasks yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTaskStatus(task.status).variant}>
                            {getTaskStatus(task.status).label}
                          </Badge>
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
                        <TableCell>
                          {formatDistanceToNow(new Date(task.createdAt))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Project Workflows</h2>
            <Link href="/workflows">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {workflows.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No workflows yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executions</TableHead>
                      <TableHead>Last Run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/workflows/${workflow.id}`}
                            className="hover:underline"
                          >
                            {workflow.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              workflow.isActive ? "default" : "secondary"
                            }
                          >
                            {workflow.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {workflow._count?.executions || 0}
                        </TableCell>
                        <TableCell>
                          {workflow.updatedAt
                            ? formatDistanceToNow(new Date(workflow.updatedAt))
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>Manage project configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Project Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(project.updatedAt))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all its data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteProject}
                  disabled={deleteProject.isPending}
                >
                  {deleteProject.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
