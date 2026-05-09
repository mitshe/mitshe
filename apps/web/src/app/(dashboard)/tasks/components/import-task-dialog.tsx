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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, RefreshCw } from "lucide-react";
import {
  useImportPreview,
  useImportConfirm,
  useImportAssigned,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import type { Project, JiraImportPreview } from "@/lib/api/types";

interface ImportTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  children?: React.ReactNode;
}

export function ImportTaskDialog({
  open,
  onOpenChange,
  projects,
  children,
}: ImportTaskDialogProps) {
  const importPreview = useImportPreview();
  const importConfirm = useImportConfirm();
  const importAssigned = useImportAssigned();

  const [importSource, setImportSource] = useState<"jira" | "youtrack" | null>(
    null,
  );
  const [importUrl, setImportUrl] = useState("");
  const [importProjectId, setImportProjectId] = useState("");
  const [preview, setPreview] = useState<JiraImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const resetImportDialog = () => {
    setImportSource(null);
    setImportUrl("");
    setImportProjectId("");
    setPreview(null);
    setImportError(null);
  };

  const handleImportPreview = async () => {
    if (!importUrl.trim()) return;
    setImportError(null);
    setPreview(null);

    try {
      const result = await importPreview.mutateAsync({ url: importUrl });
      setPreview(result);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to fetch issue preview",
      );
    }
  };

  const handleImportConfirm = async () => {
    if (!importUrl.trim()) return;
    setImportError(null);

    try {
      await importConfirm.mutateAsync({
        url: importUrl,
        projectId: importProjectId || undefined,
      });
      onOpenChange(false);
      resetImportDialog();
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Failed to import issue",
      );
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetImportDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {importSource
              ? `Import from ${importSource === "jira" ? "Jira" : "YouTrack"}`
              : "Import Task"}
          </DialogTitle>
          <DialogDescription>
            {importSource
              ? `Paste a ${importSource === "jira" ? "Jira" : "YouTrack"} issue URL to import it as a task.`
              : "Choose an issue tracker to import from."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 py-4">
          {!importSource ? (
            <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setImportSource("jira")}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0" fill="#2684FF"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/></svg>
                <div>
                  <div className="font-medium text-sm">Jira</div>
                  <div className="text-xs text-muted-foreground">Import from Atlassian Jira</div>
                </div>
              </button>
              <button
                onClick={() => setImportSource("youtrack")}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#7B68EE" opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#7B68EE"/></svg>
                <div>
                  <div className="font-medium text-sm">YouTrack</div>
                  <div className="text-xs text-muted-foreground">Import from JetBrains YouTrack</div>
                </div>
              </button>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">Or import all your assigned issues at once:</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={importAssigned.isPending}
                  onClick={async () => {
                    try {
                      const result = await importAssigned.mutateAsync({ source: 'JIRA' });
                      toast.success(`Imported ${result.imported} task(s)`, {
                        description: result.skipped > 0 ? `${result.skipped} already imported` : undefined,
                      });
                      if (result.imported > 0) onOpenChange(false);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Import failed');
                    }
                  }}
                >
                  {importAssigned.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Import all from Jira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={importAssigned.isPending}
                  onClick={async () => {
                    try {
                      const result = await importAssigned.mutateAsync({ source: 'YOUTRACK' });
                      toast.success(`Imported ${result.imported} task(s)`, {
                        description: result.skipped > 0 ? `${result.skipped} already imported` : undefined,
                      });
                      if (result.imported > 0) onOpenChange(false);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Import failed');
                    }
                  }}
                >
                  {importAssigned.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Import all from YouTrack
                </Button>
              </div>
            </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setImportSource(null);
                  setImportUrl("");
                  setPreview(null);
                  setImportError(null);
                }}
              >
                Change source
              </Button>
              <div className="space-y-2">
                <Label htmlFor="issue-url">Issue URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="issue-url"
                    placeholder={
                      importSource === "jira"
                        ? "https://yourcompany.atlassian.net/browse/PROJ-123"
                        : "https://youtrack.yourcompany.com/issue/PROJ-123"
                    }
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImportPreview();
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleImportPreview}
                    disabled={
                      importPreview.isPending || !importUrl.trim()
                    }
                  >
                    {importPreview.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {importError && (
            <Alert variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{preview.issueKey}</Badge>
                    <Badge variant="secondary">{preview.issueType}</Badge>
                    {preview.priority && (
                      <Badge variant="outline">{preview.priority}</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">
                    {preview.title}
                  </h3>
                </div>
                <Badge>{preview.status}</Badge>
              </div>

              {preview.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {preview.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Project: </span>
                  <span className="font-medium">
                    {preview.project.name} ({preview.project.key})
                  </span>
                </div>
                {preview.assignee && (
                  <div>
                    <span className="text-muted-foreground">
                      Assignee:{" "}
                    </span>
                    <span className="font-medium">
                      {preview.assignee}
                    </span>
                  </div>
                )}
                {preview.labels.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Labels:{" "}
                    </span>
                    {preview.labels.map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="ml-1"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
                {preview.components.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Components:{" "}
                    </span>
                    {preview.components.map((comp) => (
                      <Badge
                        key={comp.id}
                        variant="secondary"
                        className="ml-1"
                      >
                        {comp.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <Label htmlFor="import-project">
                  Assign to Project (optional)
                </Label>
                <Select
                  value={importProjectId}
                  onValueChange={setImportProjectId}
                >
                  <SelectTrigger className="mt-1">
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
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetImportDialog();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportConfirm}
            disabled={!preview || importConfirm.isPending}
          >
            {importConfirm.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
