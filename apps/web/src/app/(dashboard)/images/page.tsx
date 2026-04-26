"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useSnapshots,
  useCreateSnapshot,
  useUpdateSnapshot,
  useDeleteSnapshot,
  useSessions,
} from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Plus,
  Trash2,
  Loader2,
  Container,
  Clock,
  Play,
} from "lucide-react";
import type { Snapshot } from "@mitshe/types";

export default function SnapshotsPage() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const createSnapshot = useCreateSnapshot();
  const updateSnapshot = useUpdateSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const { data: sessions = [] } = useSessions();
  const runningSessions = (sessions as Array<{ id: string; name: string; status: string }>).filter(
    (s) => s.status === "RUNNING" || s.status === "PAUSED",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSnap, setEditingSnap] = useState<{ id: string; name: string; description: string } | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSessionId, setFormSessionId] = useState("");

  const openEdit = (snap: { id: string; name: string; description?: string | null }) => {
    setEditingSnap({ id: snap.id, name: snap.name, description: snap.description || "" });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSnap) return;
    await updateSnapshot.mutateAsync({
      id: editingSnap.id,
      data: { name: editingSnap.name, description: editingSnap.description || undefined },
    });
    setEditDialogOpen(false);
    setEditingSnap(null);
  };

  const handleCreate = async () => {
    if (!formName || !formSessionId) return;

    await createSnapshot.mutateAsync({
      name: formName,
      description: formDescription || undefined,
      sessionId: formSessionId,
    });

    setDialogOpen(false);
    setFormName("");
    setFormDescription("");
    setFormSessionId("");
  };

  function formatBytes(bytes: string | null) {
    if (!bytes) return "\u2014";
    const num = Number(bytes);
    if (num === 0) return "\u2014";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let val = num;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
  }

  function statusBadge(status: string) {
    switch (status) {
      case "CREATING":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Creating</Badge>;
      case "READY":
        return <Badge variant="default">Ready</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Snapshots</h1>
          <p className="text-sm text-muted-foreground">
            Save session state as reusable snapshots for new sessions and workflows.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Snapshot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Snapshot</DialogTitle>
              <DialogDescription>
                Snapshot a running session to save its current state.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. PHP + MySQL workspace"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What's set up in this snapshot..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source Session</label>
                <Select
                  value={formSessionId}
                  onValueChange={setFormSessionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a running session" />
                  </SelectTrigger>
                  <SelectContent>
                    {runningSessions.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No running sessions
                      </SelectItem>
                    ) : (
                      runningSessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!formName || !formSessionId || createSnapshot.isPending}
              >
                {createSnapshot.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Create Snapshot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12">
          <Container className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No snapshots yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a session, set it up how you want, then snapshot it to save the state.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap: Snapshot) => (
            <div
              key={snap.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => openEdit(snap)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{snap.name}</span>
                  {statusBadge(snap.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {(snap as Snapshot & { sourceSession?: { name: string } }).sourceSession && (
                    <span>from {(snap as Snapshot & { sourceSession?: { name: string } }).sourceSession!.name}</span>
                  )}
                  {snap.sizeBytes && <span>{formatBytes(snap.sizeBytes)}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(snap.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {snap.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {snap.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {snap.status === "READY" && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                    <Link href={`/sessions?snapshot=${snap.id}`}>
                      <Play className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => deleteSnapshot.mutate(snap.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Snapshot</DialogTitle>
            <DialogDescription>Update snapshot name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editingSnap?.name || ""}
                onChange={(e) => setEditingSnap((prev) => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editingSnap?.description || ""}
                onChange={(e) => setEditingSnap((prev) => prev ? { ...prev, description: e.target.value } : null)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={!editingSnap?.name || updateSnapshot.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
