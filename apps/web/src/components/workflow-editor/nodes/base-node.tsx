"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { WorkflowNode, NODE_DEFINITIONS } from "../types";
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
  Database,
  Wand2,
  LucideIcon,
  CircleAlert,
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
  Database,
  Wand2,
};

export const BaseNode = memo(function BaseNode({
  data,
  selected,
}: NodeProps<WorkflowNode>) {
  const nodeDef = NODE_DEFINITIONS.find((n) => n.type === data.nodeType);
  const IconComponent = nodeDef ? ICON_MAP[nodeDef.icon] : CircleAlert;
  const color = nodeDef?.color || "#64748b";
  const isTrigger = data.nodeType.startsWith("trigger:");
  const isCondition =
    data.nodeType === "control:condition" || data.nodeType === "control:switch";

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[280px] rounded-xl border-2 bg-card shadow-lg transition-all",
        selected
          ? "ring-2 ring-primary ring-offset-2 shadow-xl border-primary/50"
          : "border-border/50 hover:border-border",
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3.5 !h-3.5 !bg-muted-foreground !border-[3px] !border-background !-top-[7px]"
        />
      )}

      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-[10px] border-b"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}20` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          {IconComponent && (
            <IconComponent className="w-4 h-4" style={{ color }} />
          )}
        </div>
        <span className="text-sm font-semibold truncate">{data.label}</span>
      </div>

      <div className="px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        {data.description || nodeDef?.description || "Click to configure"}
      </div>

      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3.5 !h-3.5 !bg-green-500 !border-[3px] !border-background !-bottom-[7px]"
            style={{ left: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3.5 !h-3.5 !bg-red-500 !border-[3px] !border-background !-bottom-[7px]"
            style={{ left: "70%" }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !bg-muted-foreground !border-[3px] !border-background !-bottom-[7px]"
        />
      )}
    </div>
  );
});

export default BaseNode;
