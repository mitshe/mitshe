"use client";

import { useState } from "react";
import {
  useImages,
  useCreateImage,
  useDeleteImage,
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
  HardDrive,
  Plus,
  Trash2,
  Loader2,
  Container,
  Clock,
  Layers,
} from "lucide-react";

export default function ImagesPage() {
  const { data: images = [], isLoading } = useImages();
  const createImage = useCreateImage();
  const deleteImage = useDeleteImage();
  const { data: sessions = [] } = useSessions();
  const runningSessions = sessions.filter(
    (s) => s.status === "RUNNING" || s.status === "PAUSED",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSessionId, setFormSessionId] = useState("");

  const handleCreate = async () => {
    if (!formName || !formSessionId) return;

    await createImage.mutateAsync({
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
    if (!bytes) return "—";
    const num = Number(bytes);
    if (num === 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let val = num;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Base Images
          </h1>
          <p className="text-sm text-muted-foreground">
            Snapshot sessions as reusable base images for new sessions and
            workflows.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Base Image</DialogTitle>
              <DialogDescription>
                Snapshot a running session to create a reusable base image.
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
                  placeholder="What's installed in this image..."
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
                disabled={
                  !formName || !formSessionId || createImage.isPending
                }
              >
                {createImage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <HardDrive className="h-4 w-4 mr-2" />
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
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <Container className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No base images yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a session, set it up how you want, then snapshot it as a base
            image.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source Session</TableHead>
              <TableHead>Docker</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((img: any) => (
              <TableRow key={img.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{img.name}</p>
                    {img.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {img.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {img.sourceSession ? (
                    <span className="text-sm">{img.sourceSession.name}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {img.enableDocker ? (
                    <Badge variant="secondary">DinD</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatBytes(img.sizeBytes)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(img.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => deleteImage.mutate(img.id)}
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
