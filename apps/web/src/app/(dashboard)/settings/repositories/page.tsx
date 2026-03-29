"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Loader2,
  GitBranch,
  ExternalLink,
  Settings2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useRepositories,
  useUpdateRepository,
  useBulkUpdateRepositories,
  useSyncRepositories,
  useIntegrations,
} from "@/lib/api/hooks";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import type { Repository, GitProvider } from "@/lib/api/types";

const ITEMS_PER_PAGE = 15;

const providerConfig: Record<GitProvider, { name: string; color: string }> = {
  GITLAB: { name: "GitLab", color: "bg-orange-500" },
  GITHUB: { name: "GitHub", color: "bg-gray-800" },
  BITBUCKET: { name: "Bitbucket", color: "bg-blue-600" },
};

export default function RepositoriesPage() {
  const { data: repositories = [], isLoading } = useRepositories();
  const { data: integrations = [] } = useIntegrations();
  const updateRepository = useUpdateRepository();
  const bulkUpdate = useBulkUpdateRepositories();
  const syncRepositories = useSyncRepositories();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branchPattern, setBranchPattern] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(repositories.length / ITEMS_PER_PAGE);
  const paginatedRepos = repositories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const gitIntegrations = integrations.filter(
    (i) => i.type === "GITLAB" || i.type === "GITHUB",
  );
  const hasGitIntegration = gitIntegrations.length > 0;
  const connectedIntegrations = gitIntegrations.filter(
    (i) => i.status === "CONNECTED",
  );

  const handleSync = async () => {
    try {
      const result = await syncRepositories.mutateAsync(undefined);
      if ("totalCreated" in result) {
        toast.success(
          `Synced ${result.totalCreated} new, ${result.totalUpdated} updated repositories`,
        );
      } else {
        toast.success(
          `Synced ${result.created} new, ${result.updated} updated repositories`,
        );
      }
    } catch {
      toast.error("Failed to sync repositories");
    }
  };

  const handleToggleActive = async (repo: Repository) => {
    try {
      await updateRepository.mutateAsync({
        id: repo.id,
        data: { isActive: !repo.isActive },
      });
      toast.success(
        repo.isActive ? "Repository disabled" : "Repository enabled",
      );
    } catch {
      toast.error("Failed to update repository");
    }
  };

  const handleBulkEnable = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, isActive: true });
      toast.success(`Enabled ${selectedIds.length} repositories`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to enable repositories");
    }
  };

  const handleBulkDisable = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, isActive: false });
      toast.success(`Disabled ${selectedIds.length} repositories`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to disable repositories");
    }
  };

  const handleConfigOpen = (repo: Repository) => {
    setSelectedRepo(repo);
    setBranchPattern(
      repo.branchPattern || "feature/{{task.key}}-{{task.title|slug}}",
    );
    setConfigDialogOpen(true);
  };

  const handleConfigSave = async () => {
    if (!selectedRepo) return;
    try {
      await updateRepository.mutateAsync({
        id: selectedRepo.id,
        data: { branchPattern },
      });
      toast.success("Branch pattern updated");
      setConfigDialogOpen(false);
    } catch {
      toast.error("Failed to update branch pattern");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === repositories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(repositories.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const activeCount = repositories.filter((r) => r.isActive).length;
  const totalCount = repositories.length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-muted-foreground">
            Manage Git repositories for your workflows
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncRepositories.isPending || !hasGitIntegration}
        >
          {syncRepositories.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync Repositories
        </Button>
      </div>

      {!hasGitIntegration && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No Git integrations connected. Please connect GitLab or GitHub in{" "}
            <a href="/settings/integrations" className="underline font-medium">
              Integrations
            </a>{" "}
            first.
          </AlertDescription>
        </Alert>
      )}

      {hasGitIntegration && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-4 w-4" />
            <span>Total</span>
            <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Active</span>
            <span className="font-semibold text-foreground">{activeCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span>Integrations</span>
            <span className="font-semibold text-foreground">
              {connectedIntegrations.length}
            </span>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkEnable}
            disabled={bulkUpdate.isPending}
          >
            Enable
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkDisable}
            disabled={bulkUpdate.isPending}
          >
            Disable
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Repositories</CardTitle>
          <CardDescription>
            Enable repositories to use them in workflows. Only enabled
            repositories can be selected for projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : repositories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="w-12 h-12 mx-auto mb-4" />
              <p className="mb-4">
                {hasGitIntegration
                  ? "No repositories found. Click Sync to fetch repositories from your Git providers."
                  : "Connect a Git integration to see your repositories."}
              </p>
              {hasGitIntegration && (
                <Button variant="outline" onClick={handleSync}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.length === repositories.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRepos.map((repo) => (
                    <TableRow key={repo.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(repo.id)}
                          onCheckedChange={() => toggleSelect(repo.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{repo.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {repo.fullPath}
                            </div>
                          </div>
                          <a
                            href={repo.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${providerConfig[repo.provider].color} text-white border-0`}
                        >
                          {providerConfig[repo.provider].name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {repo.defaultBranch}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={repo.isActive ? "default" : "secondary"}
                          className={
                            repo.isActive
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {repo.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            "Inactive"
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {repo.lastSyncedAt
                          ? formatDistanceToNow(new Date(repo.lastSyncedAt))
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleConfigOpen(repo)}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={repo.isActive ? "outline" : "default"}
                            onClick={() => handleToggleActive(repo)}
                            disabled={updateRepository.isPending}
                          >
                            {repo.isActive ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={repositories.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repository Settings</DialogTitle>
            <DialogDescription>
              Configure branch naming and other settings for{" "}
              {selectedRepo?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branchPattern">Branch Pattern</Label>
              <Input
                id="branchPattern"
                value={branchPattern}
                onChange={(e) => setBranchPattern(e.target.value)}
                placeholder="feature/{{task.key}}-{{task.title|slug}}"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{task.key}}"}, {"{{task.title}}"},{" "}
                {"{{task.title|slug}}"}, {"{{user.name}}"}
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Example: For task PROJ-123 &quot;Add user auth&quot;, the branch
                would be:{" "}
                <code className="text-xs">feature/PROJ-123-add-user-auth</code>
              </AlertDescription>
            </Alert>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfigSave}
              disabled={updateRepository.isPending}
            >
              {updateRepository.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
