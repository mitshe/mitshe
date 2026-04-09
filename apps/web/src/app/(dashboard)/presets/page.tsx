"use client";

import { useState } from "react";
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
  Plus,
  Loader2,
  BotMessageSquare,
  Pencil,
  Trash2,
  Terminal,
} from "lucide-react";
import {
  usePresets,
  useCreatePreset,
  useUpdatePreset,
  useDeletePreset,
  useAICredentials,
  useProjects,
  useRepositories,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import type { AgentDefinition } from "@/lib/api/types";

const providerLabels: Record<string, string> = {
  CLAUDE: "Claude",
  OPENAI: "OpenAI",
  OPENROUTER: "OpenRouter",
  GEMINI: "Gemini",
  GROQ: "Groq",
  CLAUDE_CODE_LOCAL: "Claude Code",
  OPENCLAW: "OpenClaw",
};

const emptyForm = {
  name: "",
  description: "",
  aiCredentialId: "",
  startArguments: "",
  instructions: "",
  maxSessionDurationMs: "",
  defaultProjectId: "",
  defaultRepositoryIds: [] as string[],
};

export default function PresetsPage() {
  const { data: presetsList = [], isLoading } = usePresets();
  const { data: aiCredentials = [] } = useAICredentials();
  const { data: projects = [] } = useProjects();
  const { data: repositories = [] } = useRepositories();
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const deletePreset = useDeletePreset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const activeRepos = repositories.filter((r) => r.isActive);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (preset: AgentDefinition) => {
    setEditingId(preset.id);
    setForm({
      name: preset.name,
      description: preset.description || "",
      aiCredentialId: preset.aiCredentialId || "",
      startArguments: preset.startArguments || "",
      instructions: preset.instructions || "",
      maxSessionDurationMs: preset.maxSessionDurationMs
        ? String(preset.maxSessionDurationMs / 3600000)
        : "",
      defaultProjectId: preset.defaultProjectId || "",
      defaultRepositoryIds:
        preset.defaultRepositories?.map((r) => r.repositoryId) || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const data = {
      name: form.name,
      description: form.description || undefined,
      aiCredentialId: form.aiCredentialId || undefined,
      startArguments: form.startArguments || undefined,
      instructions: form.instructions || undefined,
      maxSessionDurationMs: form.maxSessionDurationMs
        ? Number(form.maxSessionDurationMs) * 3600000
        : undefined,
      defaultProjectId: form.defaultProjectId || undefined,
      defaultRepositoryIds:
        form.defaultRepositoryIds.length > 0
          ? form.defaultRepositoryIds
          : undefined,
    };

    try {
      if (editingId) {
        await updatePreset.mutateAsync({ id: editingId, data });
        toast.success("Preset updated");
      } else {
        await createPreset.mutateAsync(data);
        toast.success("Preset created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save preset",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreset.mutateAsync(id);
      toast.success("Preset deleted");
    } catch {
      toast.error("Failed to delete preset");
    }
  };

  const toggleRepo = (repoId: string) => {
    setForm((prev) => ({
      ...prev,
      defaultRepositoryIds: prev.defaultRepositoryIds.includes(repoId)
        ? prev.defaultRepositoryIds.filter((id) => id !== repoId)
        : [...prev.defaultRepositoryIds, repoId],
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presets</h1>
          <p className="text-muted-foreground">
            Define reusable presets for your sessions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Preset" : "New Preset"}
              </DialogTitle>
              <DialogDescription>
                Define a preset that can be used when creating sessions
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Code Reviewer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What this preset does..."
                />
              </div>

              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={form.aiCredentialId}
                  onValueChange={(v) =>
                    setForm({ ...form, aiCredentialId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
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
                <Label htmlFor="startArguments">Start Arguments</Label>
                <Input
                  id="startArguments"
                  value={form.startArguments}
                  onChange={(e) =>
                    setForm({ ...form, startArguments: e.target.value })
                  }
                  placeholder="e.g., --dangerously-skip-permissions --model opus"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  CLI arguments passed to the agent CLI on start
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Project</Label>
                <Select
                  value={form.defaultProjectId}
                  onValueChange={(v) =>
                    setForm({ ...form, defaultProjectId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
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
                <Label>Default Repositories</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {activeRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      No active repositories
                    </p>
                  ) : (
                    activeRepos.map((repo) => (
                      <label
                        key={repo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={form.defaultRepositoryIds.includes(repo.id)}
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
                <Label htmlFor="maxDuration">
                  Max Session Duration (hours)
                </Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.maxSessionDurationMs}
                  onChange={(e) =>
                    setForm({ ...form, maxSessionDurationMs: e.target.value })
                  }
                  placeholder="No limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  placeholder="System instructions for the preset..."
                  rows={4}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  createPreset.isPending ||
                  updatePreset.isPending ||
                  !form.name.trim()
                }
              >
                {(createPreset.isPending || updatePreset.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Presets</CardTitle>
          <CardDescription>
            Select an agent when creating a new session to pre-fill
            configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : presetsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BotMessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Presets</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first preset
              </p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Preset
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {presetsList.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {preset.name}
                      </span>
                      {preset.aiCredential && (
                        <Badge variant="outline" className="text-[10px]">
                          {providerLabels[preset.aiCredential.provider] ||
                            preset.aiCredential.provider}
                        </Badge>
                      )}
                      {preset.startArguments && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          <Terminal className="w-2.5 h-2.5 mr-1" />
                          args
                        </Badge>
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preset.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(preset)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
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
                          <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{preset.name}
                            &quot;? Existing sessions using this agent will
                            not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(preset.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
