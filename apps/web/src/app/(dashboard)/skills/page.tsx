"use client";

import { useState } from "react";
import {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  useImportGitHubSkills,
} from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Zap, Pencil, Github, Download, Sparkles, MoreHorizontal, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Skill } from "@mitshe/types";

const CATEGORIES = [
  { value: "testing", label: "Testing" },
  { value: "devops", label: "DevOps" },
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "quality", label: "Quality" },
  { value: "other", label: "Other" },
];

export default function SkillsPage() {
  const { data: skills = [], isLoading } = useSkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const importSkills = useImportGitHubSkills();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formInstructions, setFormInstructions] = useState("");

  const [importRepo, setImportRepo] = useState("");
  const [importPath, setImportPath] = useState("");
  const [importBranch, setImportBranch] = useState("main");

  const openCreate = () => {
    setEditingSkill(null);
    setFormName("");
    setFormDescription("");
    setFormCategory("");
    setFormInstructions("");
    setDialogOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormDescription(skill.description || "");
    setFormCategory(skill.category || "");
    setFormInstructions(skill.instructions);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formInstructions.trim()) return;

    if (editingSkill) {
      await updateSkill.mutateAsync({
        id: editingSkill.id,
        data: {
          name: formName,
          description: formDescription || undefined,
          category: formCategory || undefined,
          instructions: formInstructions,
        },
      });
    } else {
      await createSkill.mutateAsync({
        name: formName,
        description: formDescription || undefined,
        category: formCategory || undefined,
        instructions: formInstructions,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSkill.mutate(deleteTarget.id);
    setDeleteTarget(null);
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
    if (selectedIds.size === skills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(skills.map((s) => s.id)));
    }
  };

  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deleteSkill.mutateAsync(id);
    }
    toast.success(`Deleted ${count} skill(s)`);
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkDeleteConfirm(false);
    setSelectMode(false);
  };

  const handleImport = async () => {
    if (!importRepo.trim()) return;
    try {
      const result = await importSkills.mutateAsync({
        repo: importRepo.trim(),
        path: importPath.trim() || undefined,
        branch: importBranch.trim() || "main",
      });
      toast.success(`Imported ${result.imported} skill(s)`, {
        description: result.skills.join(", "),
      });
      setImportDialogOpen(false);
      setImportRepo("");
      setImportPath("");
      setImportBranch("main");
    } catch (err) {
      toast.error((err as Error).message || "Import failed");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground">
            Reusable instructions installed as Claude Code slash commands in sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/chat?prompt=Create a new skill for Claude Code that...">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ask AI to create
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                    <Github className="h-4 w-4 mr-2" />
                    Import from GitHub
                  </DropdownMenuItem>
                  {skills.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectMode(true)}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select skills
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Skill
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No skills yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create skills to give Claude Code specific instructions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectMode && (
            <div className="flex items-center gap-3 px-4 py-1">
              <input
                type="checkbox"
                checked={selectedIds.size === skills.length && skills.length > 0}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </span>
            </div>
          )}
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="group flex items-center gap-3 px-4 py-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => selectMode ? toggleSelect(skill.id) : openEdit(skill)}
            >
              {selectMode ? (
                <input
                  type="checkbox"
                  checked={selectedIds.has(skill.id)}
                  onChange={() => toggleSelect(skill.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
                />
              ) : (
                <Zap className="h-4 w-4 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{skill.name}</span>
                  {skill.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {skill.category}
                    </Badge>
                  )}
                </div>
                {skill.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {skill.description}
                  </p>
                )}
              </div>
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(skill)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setDeleteTarget(skill)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? "Edit Skill" : "Create Skill"}
            </DialogTitle>
            <DialogDescription>
              Instructions that Claude Code will follow in sessions using this
              skill.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. E2E Testing"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions (Markdown)</Label>
              <Textarea
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="Write instructions for Claude Code..."
                className="min-h-[200px] max-h-[40vh] font-mono text-sm"
                rows={12}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={
                !formName.trim() ||
                !formInstructions.trim() ||
                createSkill.isPending ||
                updateSkill.isPending
              }
            >
              {createSkill.isPending || updateSkill.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingSkill ? "Save Changes" : "Create Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from GitHub dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Skills from GitHub</DialogTitle>
            <DialogDescription>
              Import .md files from a public GitHub repository as skills. Each markdown file becomes a slash command in Claude Code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Repository</Label>
              <Input
                value={importRepo}
                onChange={(e) => setImportRepo(e.target.value)}
                placeholder="owner/repo (e.g. forrestchang/andrej-karpathy-skills)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subdirectory (optional)</Label>
                <Input
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  placeholder="e.g. skills/ or .claude/commands"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input
                  value={importBranch}
                  onChange={(e) => setImportBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Popular repositories:</p>
              <button
                type="button"
                className="block hover:text-foreground transition-colors text-left"
                onClick={() => setImportRepo("anthropics/claude-code")}
              >
                anthropics/claude-code — official Claude Code commands
              </button>
              <button
                type="button"
                className="block hover:text-foreground transition-colors text-left"
                onClick={() => setImportRepo("forrestchang/andrej-karpathy-skills")}
              >
                forrestchang/andrej-karpathy-skills — Karpathy coding guidelines
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleImport}
              disabled={!importRepo.trim() || importSkills.isPending}
            >
              {importSkills.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Import Skills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} skill(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected skills. This action cannot be undone.
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
