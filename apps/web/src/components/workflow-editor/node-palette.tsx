"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  NodeDefinition,
  NodeCategory,
  NodeProvider,
  CATEGORY_LABELS,
  getNodesByCategory,
} from "./types";
import {
  Play,
  Webhook,
  Clock,
  Ticket,
  GitCommit,
  GitPullRequest,
  Sparkles,
  MessageSquare,
  Search,
  Code,
  PlusCircle,
  Edit,
  ArrowRight,
  MessageCircle,
  GitBranch,
  GitMerge,
  Mail,
  GitFork,
  Route,
  Repeat,
  Split,
  Timer,
  Variable,
  Map,
  Filter,
  Globe,
  Terminal,
  Component,
  Tag,
  LucideIcon,
  ChevronDown,
  ChevronRight,
  SearchIcon,
  Database,
  Wand2,
  Bot,
  FileText,
  FileEdit,
  FilePlus,
  FileOutput,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Play,
  Webhook,
  Clock,
  Ticket,
  GitCommit,
  GitPullRequest,
  Sparkles,
  MessageSquare,
  Search,
  Code,
  PlusCircle,
  Edit,
  ArrowRight,
  MessageCircle,
  GitBranch,
  GitMerge,
  Mail,
  GitFork,
  Route,
  Repeat,
  Split,
  Timer,
  Variable,
  Map,
  Filter,
  Globe,
  Terminal,
  Component,
  Tag,
  Database,
  Wand2,
  Bot,
  FileText,
  FileEdit,
  FilePlus,
  FileOutput,
};

// Provider badge configuration
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

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePalette = memo(function NodePalette({
  onDragStart,
}: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // All categories collapsed by default
  const [expandedCategories, setExpandedCategories] = useState<
    Set<NodeCategory>
  >(new Set());

  const nodesByCategory = getNodesByCategory();

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filterNodes = (nodes: NodeDefinition[]) => {
    if (!searchQuery.trim()) return nodes;
    const query = searchQuery.toLowerCase();
    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query),
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/50 border-r overflow-hidden">
      <div className="p-3 border-b bg-card shrink-0">
        <h2 className="font-semibold text-sm mb-2">Nodes</h2>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 pb-4">
          {(Object.keys(nodesByCategory) as NodeCategory[]).map((category) => {
            const nodes = filterNodes(nodesByCategory[category]);
            if (nodes.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {CATEGORY_LABELS[category]}
                  <span className="ml-auto text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                    {nodes.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-1.5 mt-1.5 ml-1">
                    {nodes.map((node) => (
                      <NodeItem
                        key={node.type}
                        node={node}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t bg-muted/50 shrink-0">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Drag & drop nodes onto the canvas
        </p>
      </div>
    </div>
  );
});

interface NodeItemProps {
  node: NodeDefinition;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

const NodeItem = memo(function NodeItem({ node, onDragStart }: NodeItemProps) {
  const IconComponent = ICON_MAP[node.icon];
  const providerConfig = node.provider ? PROVIDER_CONFIG[node.provider] : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab",
        "bg-background/50 border border-transparent",
        "hover:bg-accent hover:border-border/50 transition-all",
        "active:cursor-grabbing active:scale-[0.98]",
        "shadow-sm hover:shadow",
      )}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${node.color}15` }}
      >
        {IconComponent && (
          <IconComponent className="w-4 h-4" style={{ color: node.color }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{node.label}</span>
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
        <div className="text-[11px] text-muted-foreground truncate leading-tight">
          {node.description}
        </div>
      </div>
    </div>
  );
});

export default NodePalette;
