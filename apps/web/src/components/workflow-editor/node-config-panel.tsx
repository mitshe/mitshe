"use client";

import { memo, useCallback, useState } from "react";
import { Node } from "@xyflow/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  X,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ChevronsUpDown,
  GitBranch,
} from "lucide-react";
import { WorkflowNodeData, NODE_DEFINITIONS, NodeProvider } from "./types";
import { useRepositories, useAICredentials } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

// Provider badge configuration (same as in node-palette)
const PROVIDER_CONFIG: Record<
  NonNullable<NodeProvider>,
  { label: string; color: string; bgColor: string }
> = {
  jira: { label: "JIRA", color: "#fff", bgColor: "#0052cc" },
  youtrack: { label: "YouTrack", color: "#fff", bgColor: "#8b5cf6" },
  git: { label: "Git", color: "#fff", bgColor: "#f97316" },
  gitlab: { label: "GitLab", color: "#fff", bgColor: "#fc6d26" },
  github: { label: "GitHub", color: "#fff", bgColor: "#333" },
  slack: { label: "Slack", color: "#fff", bgColor: "#4a154b" },
  discord: { label: "Discord", color: "#fff", bgColor: "#5865f2" },
  telegram: { label: "Telegram", color: "#fff", bgColor: "#0088cc" },
  email: { label: "Email", color: "#fff", bgColor: "#e11d48" },
  obsidian: { label: "Obsidian", color: "#fff", bgColor: "#7c3aed" },
  ai: { label: "AI", color: "#fff", bgColor: "#8b5cf6" },
};

interface NodeConfigPanelProps {
  node: Node<WorkflowNodeData>;
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeConfigPanel = memo(function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const nodeDef = NODE_DEFINITIONS.find((n) => n.type === node.data.nodeType);
  const providerConfig = nodeDef?.provider
    ? PROVIDER_CONFIG[nodeDef.provider]
    : null;

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(node.id, { label: e.target.value });
    },
    [node.id, onUpdate],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(node.id, { description: e.target.value });
    },
    [node.id, onUpdate],
  );

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(node.id, {
        config: { ...node.data.config, [key]: value },
      });
    },
    [node.id, node.data.config, onUpdate],
  );

  const handleDelete = useCallback(() => {
    onDelete(node.id);
    onClose();
  }, [node.id, onDelete, onClose]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-card/50 border-l">
      <div className="flex items-center justify-between p-3 border-b bg-card shrink-0 flex-none">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${nodeDef?.color || "#64748b"}20` }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: nodeDef?.color || "#64748b" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">
                {nodeDef?.label || "Node"}
              </h3>
              {providerConfig && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: providerConfig.bgColor,
                    color: providerConfig.color,
                  }}
                >
                  {providerConfig.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {nodeDef?.description}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="node-label" className="text-xs">
                Display Name
              </Label>
              <Input
                id="node-label"
                value={node.data.label}
                onChange={handleLabelChange}
                placeholder="Node label"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="node-description" className="text-xs">
                Description
              </Label>
              <Input
                id="node-description"
                value={node.data.description || ""}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                className="h-9"
              />
            </div>

            {nodeDef && (
              <ConfigFields
                nodeType={node.data.nodeType}
                config={node.data.config}
                defaultConfig={nodeDef.defaultConfig}
                onChange={handleConfigChange}
              />
            )}

            <VariablesPanel />
          </div>
        </ScrollArea>
      </div>

      <div className="p-3 border-t bg-muted/30 shrink-0 flex-none">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
});

interface ConfigFieldsProps {
  nodeType: string;
  config: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const RepositorySelector = memo(function RepositorySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: repositories = [], isLoading } = useRepositories(true);

  const selectedRepo = repositories.find((repo) => repo.id === value);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading repositories...
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          {selectedRepo ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GitBranch className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selectedRepo.fullPath || selectedRepo.name}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {selectedRepo.provider}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select repository...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search repositories..." className="h-9" />
          <CommandList>
            <CommandEmpty>No repository found.</CommandEmpty>
            <CommandGroup>
              {repositories.map((repo) => (
                <CommandItem
                  key={repo.id}
                  value={`${repo.fullPath || repo.name} ${repo.provider}`}
                  onSelect={() => {
                    onChange(repo.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">
                      {repo.fullPath || repo.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                      {repo.provider}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === repo.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

const AICredentialSelector = memo(function AICredentialSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: credentials = [], isLoading } = useAICredentials();

  const selectedCredential = credentials.find((cred) => cred.id === value);
  const defaultCredential = credentials.find((cred) => cred.isDefault);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading AI credentials...
        </span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
        No AI credentials configured
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          {selectedCredential ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedCredential.provider}</span>
              {selectedCredential.isDefault && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                  Default
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">
              {defaultCredential
                ? `Use default (${defaultCredential.provider})`
                : "Select AI credential..."}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search credentials..." className="h-9" />
          <CommandList>
            <CommandEmpty>No credential found.</CommandEmpty>
            <CommandGroup>
              {/* Option to use default */}
              <CommandItem
                value="default"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    Use default credential
                  </span>
                  {defaultCredential && (
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                      ({defaultCredential.provider})
                    </span>
                  )}
                </div>
                <Check
                  className={cn(
                    "ml-2 h-4 w-4 shrink-0",
                    !value ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
              {credentials.map((cred) => (
                <CommandItem
                  key={cred.id}
                  value={`${cred.provider} ${cred.id}`}
                  onSelect={() => {
                    onChange(cred.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">
                      {cred.provider}
                    </span>
                    {cred.isDefault && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === cred.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

const ConfigFields = memo(function ConfigFields({
  nodeType,
  config,
  defaultConfig,
  onChange,
}: ConfigFieldsProps) {
  const renderField = (key: string, defaultValue: unknown) => {
    const value = config[key] ?? defaultValue;
    const label = formatLabel(key);

    // AI Credential selector for AI nodes
    if (key === "aiCredentialId") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            AI Credential
          </Label>
          <AICredentialSelector
            value={value as string}
            onChange={(v) => onChange(key, v)}
          />
          <p className="text-[10px] text-muted-foreground/70">
            Leave empty to use the default AI credential
          </p>
        </div>
      );
    }

    if (key === "repositoryId") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            Repository
          </Label>
          <RepositorySelector
            value={value as string}
            onChange={(v) => onChange(key, v)}
          />
          {nodeType.startsWith("data:") && (
            <p className="text-[10px] text-muted-foreground/70">
              Use: {"{{nodes.thisNodeId.repositoryId}}"} in Git actions
            </p>
          )}
        </div>
      );
    }

    if (typeof defaultValue === "string") {
      const isLongText = [
        "prompt",
        "systemPrompt",
        "description",
        "body",
        "message",
        "comment",
        "content",
        "diff",
        "expression",
      ].includes(key);

      if (isLongText) {
        return (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`config-${key}`} className="text-xs">
              {label}
            </Label>
            <textarea
              id={`config-${key}`}
              value={value as string}
              onChange={(e) => onChange(key, e.target.value)}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            <p className="text-[10px] text-muted-foreground/70">
              Variables: {"{{trigger.field}}"} or {"{{nodes.nodeId.field}}"}
            </p>
          </div>
        );
      }

      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            {label}
          </Label>
          <Input
            id={`config-${key}`}
            value={value as string}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="h-9"
          />
        </div>
      );
    }

    if (typeof defaultValue === "number") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            {label}
          </Label>
          <Input
            id={`config-${key}`}
            type="number"
            value={value as number}
            onChange={(e) => onChange(key, parseInt(e.target.value) || 0)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="h-9"
          />
        </div>
      );
    }

    if (typeof defaultValue === "boolean") {
      return (
        <div key={key} className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id={`config-${key}`}
            checked={value as boolean}
            onChange={(e) => onChange(key, e.target.checked)}
            className="h-4 w-4 rounded border-input bg-background"
          />
          <Label htmlFor={`config-${key}`} className="text-xs cursor-pointer">
            {label}
          </Label>
        </div>
      );
    }

    if (Array.isArray(defaultValue)) {
      const arrayValue = value as unknown[];
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            {label}
          </Label>
          <Input
            id={`config-${key}`}
            value={arrayValue.join(", ")}
            onChange={(e) =>
              onChange(
                key,
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="Comma-separated values"
            className="h-9"
          />
        </div>
      );
    }

    if (typeof defaultValue === "object" && defaultValue !== null) {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`config-${key}`} className="text-xs">
            {label}
          </Label>
          <textarea
            id={`config-${key}`}
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(key, JSON.parse(e.target.value));
              } catch {}
            }}
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            placeholder="JSON value"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Configuration
      </h4>
      <div className="space-y-3">
        {Object.entries(defaultConfig).map(([key, defaultValue]) =>
          renderField(key, defaultValue),
        )}
      </div>
    </div>
  );
});

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

const EXPRESSION_VARIABLES = [
  {
    category: "Shortcuts",
    variables: [
      { expr: "{{branch}}", desc: "Current branch name" },
      { expr: "{{repo}}", desc: "Repository path (org/repo)" },
      { expr: "{{files}}", desc: "Files from AI task" },
      { expr: "{{issue}}", desc: "JIRA issue key" },
      { expr: "{{task}}", desc: "Task description" },
    ],
  },
  {
    category: "Merge Request",
    variables: [
      { expr: "{{mr.url}}", desc: "MR/PR URL" },
      { expr: "{{mr.id}}", desc: "MR/PR ID" },
    ],
  },
  {
    category: "Repository",
    variables: [
      { expr: "{{repo.name}}", desc: "Repository name" },
      { expr: "{{repo.url}}", desc: "Repository web URL" },
      { expr: "{{repo.branch}}", desc: "Default branch" },
    ],
  },
  {
    category: "Issue",
    variables: [
      { expr: "{{issue.key}}", desc: "JIRA issue key" },
      { expr: "{{issue.url}}", desc: "JIRA issue URL" },
    ],
  },
  {
    category: "Full Paths",
    variables: [
      { expr: "{{trigger.field}}", desc: "Trigger data field" },
      { expr: "{{vars.name}}", desc: "Workflow variable" },
      { expr: "{{nodes.nodeId.field}}", desc: "Node output field" },
      { expr: "{{ctx.field}}", desc: "Workflow context" },
    ],
  },
];

const VariablesPanel = memo(function VariablesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  return (
    <div className="pt-3 border-t mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1.5 hover:bg-muted/50 transition-colors rounded"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Available Variables
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="pt-2 space-y-3">
          {EXPRESSION_VARIABLES.map((category) => (
            <div key={category.category}>
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                {category.category}
              </p>
              <div className="space-y-1">
                {category.variables.map((v) => (
                  <div
                    key={v.expr}
                    className="group flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleCopy(v.expr)}
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-[11px] font-mono text-primary/80 bg-primary/5 px-1 rounded">
                        {v.expr}
                      </code>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {v.desc}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied === v.expr ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default NodeConfigPanel;
