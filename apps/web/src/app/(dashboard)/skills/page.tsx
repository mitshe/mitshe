"use client";

import { useState } from "react";
import {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Loader2,
  Zap,
  Pencil,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formInstructions, setFormInstructions] = useState("");

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground">
            Reusable instructions appended to CLAUDE.md when creating sessions.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSkill ? "Edit Skill" : "Create Skill"}
              </DialogTitle>
              <DialogDescription>
                Write instructions that Claude Code will follow in sessions
                using this skill.
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
                  placeholder="Short description of what this skill does"
                />
              </div>
              <div className="space-y-2">
                <Label>Instructions (Markdown)</Label>
                <Textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Write instructions for Claude Code..."
                  className="min-h-[200px] font-mono text-sm"
                  rows={10}
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
            Create skills to give Claude Code specific instructions for
            different tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {skills.map((skill) => {
            const isExpanded = expandedId === skill.id;
            return (
              <div key={skill.id} className="border border-border rounded-lg">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : skill.id)
                  }
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{skill.name}</span>
                      {skill.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {skill.category}
                        </Badge>
                      )}
                      {skill.isSystem && (
                        <Badge variant="outline" className="text-[10px]">
                          system
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
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {skill.isSystem ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono mt-3 max-h-[300px] overflow-y-auto">
                      {skill.instructions}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
