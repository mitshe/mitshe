"use client";

import { useState } from "react";
import {
  useSnapshots,
  useCreateSnapshot,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Plus,
  Trash2,
  Loader2,
  Container,
  Clock,
} from "lucide-react";
import type { Snapshot } from "@mitshe/types";

export default function SnapshotsPage() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const createSnapshot = useCreateSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const { data: sessionsData } = useSessions();
  const sessions = sessionsData?.sessions ?? sessionsData ?? [];
  const runningSessions = (sessions as Array<{ id: string; name: string; status: string }>).filter(
    (s) => s.status === "RUNNING" || s.status === "PAUSED",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSessionId, setFormSessionId] = useState("");

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source Session</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snap: Snapshot) => (
              <TableRow key={snap.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{snap.name}</p>
                    {snap.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {snap.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{statusBadge(snap.status)}</TableCell>
                <TableCell>
                  {(snap as Snapshot & { sourceSession?: { name: string } }).sourceSession ? (
                    <span className="text-sm">{(snap as Snapshot & { sourceSession?: { name: string } }).sourceSession!.name}</span>
                  ) : (
                    <span className="text-muted-foreground">{"\u2014"}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatBytes(snap.sizeBytes)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(snap.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => deleteSnapshot.mutate(snap.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
