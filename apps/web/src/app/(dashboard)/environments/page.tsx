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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Loader2,
  Box,
  Pencil,
  Trash2,
  X,
  Cpu,
  MemoryStick,
  Variable,
} from "lucide-react";
import {
  useEnvironments,
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import type { Environment } from "@/lib/api/types";

interface VarEntry {
  key: string;
  value: string;
  isSecret: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  memoryMb: "",
  cpuCores: "",
  setupScript: "",
  enableDocker: false,
  variables: [] as VarEntry[],
};

export default function EnvironmentsPage() {
  const { data: environments = [], isLoading } = useEnvironments();
  const createEnv = useCreateEnvironment();
  const updateEnv = useUpdateEnvironment();
  const deleteEnv = useDeleteEnvironment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (env: Environment) => {
    setEditingId(env.id);
    setForm({
      name: env.name,
      description: env.description || "",
      memoryMb: env.memoryMb ? String(env.memoryMb) : "",
      cpuCores: env.cpuCores ? String(env.cpuCores) : "",
      setupScript: env.setupScript || "",
      enableDocker: env.enableDocker || false,
      variables:
        env.variables?.map((v) => ({
          key: v.key,
          value: v.value,
          isSecret: v.isSecret,
        })) || [],
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
      memoryMb: form.memoryMb ? Number(form.memoryMb) : undefined,
      cpuCores: form.cpuCores ? Number(form.cpuCores) : undefined,
      setupScript: form.setupScript || undefined,
      enableDocker: form.enableDocker || undefined,
      variables:
        form.variables.length > 0
          ? form.variables.filter((v) => v.key.trim())
          : undefined,
    };

    try {
      if (editingId) {
        await updateEnv.mutateAsync({ id: editingId, data });
        toast.success("Environment updated");
      } else {
        await createEnv.mutateAsync(data);
        toast.success("Environment created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save environment",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEnv.mutateAsync(id);
      toast.success("Environment deleted");
    } catch {
      toast.error("Failed to delete environment");
    }
  };

  const addVariable = () => {
    setForm((prev) => ({
      ...prev,
      variables: [...prev.variables, { key: "", value: "", isSecret: false }],
    }));
  };

  const updateVariable = (
    index: number,
    field: keyof VarEntry,
    value: string | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const removeVariable = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Environments</h1>
          <p className="text-muted-foreground">
            Define container configurations with env vars and resource limits
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Environment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Environment" : "New Environment"}
              </DialogTitle>
              <DialogDescription>
                Configure container resources, env vars, and setup scripts
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Node + Python"
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
                  placeholder="What this environment includes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="memoryMb">Memory (MB)</Label>
                  <Input
                    id="memoryMb"
                    type="number"
                    min="256"
                    value={form.memoryMb}
                    onChange={(e) =>
                      setForm({ ...form, memoryMb: e.target.value })
                    }
                    placeholder="4096 (default)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpuCores">CPU Cores</Label>
                  <Input
                    id="cpuCores"
                    type="number"
                    min="1"
                    value={form.cpuCores}
                    onChange={(e) =>
                      setForm({ ...form, cpuCores: e.target.value })
                    }
                    placeholder="2 (default)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupScript">Setup Script</Label>
                <Textarea
                  id="setupScript"
                  value={form.setupScript}
                  onChange={(e) =>
                    setForm({ ...form, setupScript: e.target.value })
                  }
                  placeholder={"pip install pytest\nnpm i -g tsx"}
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Runs on container start before the session begins
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enableDocker"
                  checked={form.enableDocker}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, enableDocker: checked === true })
                  }
                />
                <Label htmlFor="enableDocker" className="font-normal cursor-pointer text-sm">
                  Enable Docker (mount host Docker socket)
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Environment Variables</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariable}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {form.variables.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No variables defined
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.variables.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={v.key}
                          onChange={(e) =>
                            updateVariable(i, "key", e.target.value)
                          }
                          placeholder="KEY"
                          className="font-mono text-sm w-32"
                        />
                        <Input
                          value={v.value}
                          onChange={(e) =>
                            updateVariable(i, "value", e.target.value)
                          }
                          placeholder="value"
                          type={v.isSecret ? "password" : "text"}
                          className="font-mono text-sm flex-1"
                        />
                        <Checkbox
                          checked={v.isSecret}
                          onCheckedChange={(checked) =>
                            updateVariable(i, "isSecret", checked === true)
                          }
                          title="Secret"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeVariable(i)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                  createEnv.isPending ||
                  updateEnv.isPending ||
                  !form.name.trim()
                }
              >
                {(createEnv.isPending || updateEnv.isPending) && (
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
          <CardTitle>All Environments</CardTitle>
          <CardDescription>
            Select an environment when creating a session or preset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : environments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Box className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Environments</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first environment configuration
              </p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Environment
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{env.name}</span>
                      {env.memoryMb && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-0.5"
                        >
                          <MemoryStick className="w-2.5 h-2.5" />
                          {env.memoryMb}MB
                        </Badge>
                      )}
                      {env.cpuCores && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-0.5"
                        >
                          <Cpu className="w-2.5 h-2.5" />
                          {env.cpuCores} cores
                        </Badge>
                      )}
                      {env.enableDocker && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-0.5"
                        >
                          Docker
                        </Badge>
                      )}
                      {env.variables && env.variables.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-0.5"
                        >
                          <Variable className="w-2.5 h-2.5" />
                          {env.variables.length} vars
                        </Badge>
                      )}
                    </div>
                    {env.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {env.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(env)}
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
                          <AlertDialogTitle>
                            Delete Environment
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{env.name}
                            &quot;? Sessions and presets using it will not be
                            affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(env.id)}
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
