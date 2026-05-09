"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  Workflow as WorkflowIcon,
  Code2,
  GitPullRequest,
  MessageSquare,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProjects,
  useCreateWorkflow,
  useWorkflowTemplates,
  useCreateWorkflowFromTemplate,
} from "@/lib/api/hooks";
import type { WorkflowTemplateMetadata } from "@/lib/api/types";

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

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workflowId: string) => void;
}

export function CreateWorkflowDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkflowDialogProps) {
  const { data: projects = [] } = useProjects();
  const { data: templates = [], isLoading: templatesLoading } =
    useWorkflowTemplates();
  const createWorkflow = useCreateWorkflow();
  const createFromTemplate = useCreateWorkflowFromTemplate();

  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateMetadata | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    projectId: "",
  });

  const resetState = () => {
    setCreateMode("blank");
    setSelectedTemplate(null);
    setNewWorkflow({ name: "", description: "", projectId: "" });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleCreate = async () => {
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

      handleOpenChange(false);
      onCreated(result.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create workflow";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createWorkflow.isPending || createFromTemplate.isPending
                }
              >
                {createWorkflow.isPending || createFromTemplate.isPending ? (
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
  );
}
