"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showContextMenu, type ContextMenuItem } from "./context-menu";

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export type GitFileStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "changed";

const gitStatusColors: Record<GitFileStatus, string> = {
  modified: "text-yellow-500",
  added: "text-green-500",
  deleted: "text-red-500",
  renamed: "text-blue-400",
  untracked: "text-green-400",
  changed: "text-yellow-400",
};

const gitStatusLetters: Record<GitFileStatus, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  untracked: "U",
  changed: "C",
};

export function buildFileTree(
  paths: string[],
  basePath: string,
): FileTreeNode[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: Record<string, any> = {};

  for (const filePath of paths) {
    const relative = filePath.startsWith(basePath)
      ? filePath.slice(basePath.length + 1)
      : filePath;
    const parts = relative.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isFile ? "file" : "directory",
          _children: isFile ? null : {},
        };
      }
      if (!isFile) current = current[part]._children;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toArray(obj: Record<string, any>): FileTreeNode[] {
    return Object.values(obj)
      .map((n) => ({
        name: n.name,
        path: n.path,
        type: n.type as "file" | "directory",
        children: n._children ? toArray(n._children) : undefined,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toArray(root);
}

function dirHasChanges(
  node: FileTreeNode,
  gitStatuses: Map<string, GitFileStatus>,
): boolean {
  if (node.type === "file") return gitStatuses.has(node.path);
  return (
    node.children?.some((child) => dirHasChanges(child, gitStatuses)) ?? false
  );
}

function showFileContextMenu(
  e: React.MouseEvent,
  path: string,
  type: "file" | "directory",
  actions: FileTreeActions,
) {
  const items: ContextMenuItem[] = [];

  if (type === "file") {
    items.push({ label: "Open", action: () => actions.onFileClick(path) });
  }

  // For directories: create inside them. For files: create in parent dir.
  const targetDir =
    type === "directory" ? path : path.split("/").slice(0, -1).join("/") || ".";

  if (actions.onNewFile) {
    items.push({
      label: "New File...",
      action: () => actions.onNewFile!(targetDir),
    });
  }

  if (actions.onNewFolder) {
    items.push({
      label: "New Folder...",
      action: () => actions.onNewFolder!(targetDir),
    });
  }

  items.push({
    label: "Copy Path",
    action: () => navigator.clipboard.writeText(path),
    separator: true,
  });

  items.push({
    label: "Copy Full Path",
    action: () => navigator.clipboard.writeText(`/workspace/${path}`),
  });

  if (actions.onRename) {
    items.push({
      label: "Rename...",
      action: () => actions.onRename!(path),
      separator: true,
    });
  }

  if (actions.onDelete) {
    items.push({
      label: "Delete",
      action: () => actions.onDelete!(path),
      destructive: true,
    });
  }

  showContextMenu(e, items);
}

export interface FileTreeActions {
  onFileClick: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string) => void;
  onNewFile?: (dirPath: string) => void;
  onNewFolder?: (dirPath: string) => void;
}

function FileTreeItem({
  node,
  depth = 0,
  actions,
  gitStatuses,
}: {
  node: FileTreeNode;
  depth?: number;
  actions: FileTreeActions;
  gitStatuses: Map<string, GitFileStatus>;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1);

  const fileStatus = gitStatuses.get(node.path);
  const colorClass = fileStatus ? gitStatusColors[fileStatus] : "";
  const hasChangedChildren =
    node.type === "directory" && dirHasChanges(node, gitStatuses);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showFileContextMenu(e, node.path, node.type, actions),
    [node.path, node.type, actions],
  );

  if (node.type === "file") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 py-0.5 px-2 text-xs hover:bg-muted/50 rounded cursor-pointer",
          fileStatus
            ? colorClass
            : "text-muted-foreground hover:text-foreground",
        )}
        data-file-item
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => actions.onFileClick(node.path)}
        onContextMenu={handleContextMenu}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{node.name}</span>
        {fileStatus && (
          <span
            className={cn(
              "text-[10px] font-mono font-bold shrink-0",
              colorClass,
            )}
          >
            {gitStatusLetters[fileStatus]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-2 text-xs font-medium hover:bg-muted/50 rounded cursor-pointer",
          hasChangedChildren && "text-yellow-500",
        )}
        data-file-item
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
        onContextMenu={handleContextMenu}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
        {isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen &&
        node.children?.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            actions={actions}
            gitStatuses={gitStatuses}
          />
        ))}
    </div>
  );
}

export function FileTree({
  files,
  basePath,
  isLoading,
  onFileClick,
  onDelete,
  onRename,
  onNewFile,
  onNewFolder,
  gitStatuses,
  hideHeader,
}: {
  files: string[];
  basePath: string;
  isLoading: boolean;
  onFileClick: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string) => void;
  onNewFile?: (dirPath: string) => void;
  onNewFolder?: (dirPath: string) => void;
  gitStatuses?: Array<{ path: string; status: string }>;
  hideHeader?: boolean;
}) {
  const fileTree = buildFileTree(files, basePath);

  const statusMap = new Map<string, GitFileStatus>();
  if (gitStatuses) {
    for (const { path, status } of gitStatuses) {
      statusMap.set(path, status as GitFileStatus);
    }
  }

  const actions: FileTreeActions = {
    onFileClick,
    onDelete,
    onRename,
    onNewFile,
    onNewFolder,
  };

  return (
    <div className="border-r shrink-0 flex flex-col overflow-hidden min-h-0 h-full">
      {!hideHeader && (
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Files
          </p>
        </div>
      )}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        onContextMenu={(e) => {
          // Context menu on empty space — New File / New Folder at root
          if ((e.target as HTMLElement).closest("[data-file-item]")) return;
          const items: ContextMenuItem[] = [];
          if (onNewFile) {
            items.push({
              label: "New File...",
              action: () => onNewFile("."),
            });
          }
          if (onNewFolder) {
            items.push({
              label: "New Folder...",
              action: () => onNewFolder("."),
            });
          }
          if (items.length > 0) {
            showContextMenu(e, items);
          }
        }}
      >
        <div className="py-1">
          {fileTree.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {isLoading ? "Loading files..." : "No files"}
            </p>
          ) : (
            fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                actions={actions}
                gitStatuses={statusMap}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
