"use client";

import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FolderOpen } from "lucide-react";
import { providerLabels } from "@/lib/status-config";
import { isDesktopApp, selectLocalFolder } from "@/lib/desktop";

export interface ThreadFormData {
  name: string;
  projectId: string;
  repositoryIds: string[];
  branch: string;
  integrationIds: string[];
  aiCredentialId: string;
  startArguments: string;
  enableDocker: boolean;
  mountSsh: boolean;
  baseImageId: string;
  skillIds: string[];
  instructions: string;
  localPath: string;
}

interface ThreadFormFieldsProps {
  form: ThreadFormData;
  setForm: (updater: ThreadFormData | ((prev: ThreadFormData) => ThreadFormData)) => void;
  configLocked: boolean;
  sessionProviders: Array<{ id: string; provider: string }>;
  readySnapshots: Array<{ id: string; name: string; description?: string | null; enableDocker?: boolean }>;
  projects: Array<{ id: string; name: string }>;
  activeRepos: Array<{ id: string; fullPath: string }>;
  repoSearch: string;
  setRepoSearch: (v: string) => void;
  branches: Array<{ name: string; isDefault: boolean }>;
  activeIntegrations: Array<{ id: string; type: string }>;
  skillsList: Array<{ id: string; name: string; category?: string | null; isSystem?: boolean }>;
}

export function ThreadFormFields({
  form,
  setForm,
  configLocked,
  sessionProviders,
  readySnapshots,
  projects,
  activeRepos,
  repoSearch,
  setRepoSearch,
  branches,
  activeIntegrations,
  skillsList,
}: ThreadFormFieldsProps) {
  const toggleRepo = (repoId: string) => {
    setForm((prev) => ({
      ...prev,
      repositoryIds: prev.repositoryIds.includes(repoId)
        ? prev.repositoryIds.filter((id) => id !== repoId)
        : [...prev.repositoryIds, repoId],
    }));
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Thread Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Refactor auth module"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>AI Agent</Label>
        {sessionProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 border rounded-md px-3">
            Claude Code is pre-installed in every thread. You can log in with your Anthropic account directly in the terminal, or{" "}
            <a href="/settings/ai" className="underline font-medium text-foreground">
              add an API key
            </a>{" "}
            for automatic setup.
          </p>
        ) : (
          <Select
            value={form.aiCredentialId}
            onValueChange={(v) => setForm({ ...form, aiCredentialId: v })}
            disabled={configLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="None - plain bash terminal" />
            </SelectTrigger>
            <SelectContent>
              {sessionProviders.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {providerLabels[c.provider] || c.provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Threads run CLI agents (Claude Code or OpenClaw) in isolated containers
        </p>
      </div>

      {readySnapshots.length > 0 && (
        <div className="space-y-2">
          <Label>Snapshot</Label>
          <Select
            value={form.baseImageId || "none"}
            onValueChange={(v) => {
              const actualValue = v === "none" ? "" : v;
              const snap = readySnapshots.find((s) => s.id === actualValue);
              setForm({
                ...form,
                baseImageId: actualValue,
                enableDocker: snap?.enableDocker ?? form.enableDocker,
              });
            }}
            disabled={configLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="No snapshot (fresh container)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No snapshot (fresh container)</SelectItem>
              {readySnapshots.map((snap) => (
                <SelectItem key={snap.id} value={snap.id}>
                  {snap.name}
                  {snap.description && (
                    <span className="text-muted-foreground ml-2">
                      - {snap.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Start from a saved environment with pre-installed tools and repos
          </p>
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 group w-full">
          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
          Advanced options
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
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

          {isDesktopApp() && (
            <div className="space-y-2">
              <Label>Local Project</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                disabled={configLocked}
                onClick={async () => {
                  const folderPath = await selectLocalFolder();
                  if (folderPath) {
                    const folderName = folderPath.split("/").pop() || "Local Project";
                    setForm({ ...form, localPath: folderPath, name: form.name || folderName });
                  }
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {form.localPath || "Choose folder..."}
              </Button>
              <p className="text-xs text-muted-foreground">
                Mount a local folder into the thread workspace
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Repositories{form.repositoryIds.length > 0 && ` (${form.repositoryIds.length})`}</Label>
            <div className="border rounded-md overflow-hidden">
              {activeRepos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No active repositories. Import some first.
                </p>
              ) : (
                <>
                  {activeRepos.length > 5 && (
                    <div className="px-2 pt-2">
                      <Input
                        placeholder="Search repositories..."
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                    {activeRepos
                      .filter((r) =>
                        !repoSearch || r.fullPath.toLowerCase().includes(repoSearch.toLowerCase())
                      )
                      .map((repo) => (
                        <label
                          key={repo.id}
                          className={`flex items-center gap-2 p-1.5 rounded ${
                            configLocked
                              ? "cursor-not-allowed opacity-60"
                              : "hover:bg-muted/50 cursor-pointer"
                          }`}
                        >
                          <Checkbox
                            checked={form.repositoryIds.includes(repo.id)}
                            onCheckedChange={() => toggleRepo(repo.id)}
                            disabled={configLocked}
                          />
                          <span className="text-sm truncate">
                            {repo.fullPath}
                          </span>
                        </label>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {form.repositoryIds.length > 0 && branches.length > 0 && (
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form.branch}
                onValueChange={(v) => setForm({ ...form, branch: v === "_default" ? "" : v })}
                disabled={configLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">Default branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}{b.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Branch to checkout when cloning the repository
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Integrations</Label>
            <p className="text-xs text-muted-foreground">
              Credentials for selected integrations will be available inside
              the thread container
            </p>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {activeIntegrations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No connected integrations.{" "}
                  <a href="/settings/integrations" className="underline">
                    Configure some first
                  </a>
                </p>
              ) : (
                activeIntegrations.map((integration) => (
                  <label
                    key={integration.id}
                    className={`flex items-center gap-2 p-1.5 rounded ${
                      configLocked
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      checked={form.integrationIds.includes(integration.id)}
                      onCheckedChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          integrationIds:
                            prev.integrationIds.includes(integration.id)
                              ? prev.integrationIds.filter((id) => id !== integration.id)
                              : [...prev.integrationIds, integration.id],
                        }))
                      }
                      disabled={configLocked}
                    />
                    <span className="text-sm">{integration.type}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startArgs">Start Arguments</Label>
            <Input
              id="startArgs"
              value={form.startArguments}
              onChange={(e) => setForm({ ...form, startArguments: e.target.value })}
              placeholder="e.g., --dangerously-skip-permissions --model opus"
              className="font-mono text-sm"
              disabled={configLocked}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="enableDocker"
              checked={form.enableDocker}
              onCheckedChange={(checked) =>
                setForm({ ...form, enableDocker: checked === true })
              }
              disabled={configLocked}
            />
            <Label
              htmlFor="enableDocker"
              className={`font-normal text-sm ${
                configLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              Enable Docker-in-Docker
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="autoAccept"
              checked={form.startArguments?.includes("--dangerously-skip-permissions") ?? false}
              onCheckedChange={(checked) => {
                const flag = "--dangerously-skip-permissions";
                const current = form.startArguments || "";
                const hasFlag = current.includes(flag);
                if (checked && !hasFlag) {
                  setForm({ ...form, startArguments: (current + " " + flag).trim() });
                } else if (!checked && hasFlag) {
                  setForm({ ...form, startArguments: current.replace(flag, "").trim() });
                }
              }}
              disabled={configLocked}
            />
            <Label
              htmlFor="autoAccept"
              className={`font-normal text-sm ${
                configLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              Auto-accept permissions (skip confirmation prompts)
            </Label>
          </div>

          {skillsList.length > 0 && (
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="grid grid-cols-2 gap-2">
                {skillsList.map((skill) => {
                  const selected = form.skillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      disabled={configLocked}
                      onClick={() => {
                        setForm({
                          ...form,
                          skillIds: selected
                            ? form.skillIds.filter((id) => id !== skill.id)
                            : [...form.skillIds, skill.id],
                        });
                      }}
                      className={`text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      } ${configLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span className="font-medium">{skill.name}</span>
                      {skill.category && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {skill.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected skills append instructions to CLAUDE.md
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="System instructions for the agent..."
              rows={4}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
