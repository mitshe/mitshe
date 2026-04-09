"use client";

import { X, Terminal as TerminalIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { showContextMenu } from "./context-menu";

export interface Tab {
  id: string;
  title: string;
  type: "terminal" | "file";
  filePath?: string;
  terminalId?: string;
  cmd?: string[];
  closeable: boolean;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onRename,
}: {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseAll?: () => void;
  onRename?: (id: string) => void;
}) {
  return (
    <div className="flex items-center border-b bg-background overflow-x-auto shrink-0">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r cursor-pointer select-none shrink-0",
            "hover:bg-muted/50 transition-colors",
            activeTabId === tab.id
              ? "bg-background text-foreground border-b-2 border-b-primary"
              : "bg-muted/30 text-muted-foreground",
          )}
          onClick={() => onTabClick(tab.id)}
          onAuxClick={(e) => {
            if (e.button === 1 && tab.closeable) {
              e.preventDefault();
              onTabClose(tab.id);
            }
          }}
          onContextMenu={(e) => {
            const items = [];

            if (tab.filePath) {
              items.push({
                label: "Copy Path",
                action: () =>
                  navigator.clipboard.writeText(tab.filePath || ""),
              });
              items.push({
                label: "Copy Full Path",
                action: () =>
                  navigator.clipboard.writeText(
                    `/workspace/${tab.filePath}`,
                  ),
              });
            }

            if (tab.closeable) {
              items.push({
                label: "Close",
                action: () => onTabClose(tab.id),
                separator: items.length > 0,
              });

              if (onCloseOthers) {
                items.push({
                  label: "Close Others",
                  action: () => onCloseOthers(tab.id),
                });
              }
            }

            if (onRename) {
              items.push({
                label: "Rename",
                action: () => onRename(tab.id),
                separator: true,
              });
            }

            if (onCloseAll) {
              items.push({
                label: "Close All Files",
                action: () => onCloseAll(),
              });
            }

            if (items.length > 0) {
              showContextMenu(e, items);
            }
          }}
        >
          {tab.type === "terminal" ? (
            <TerminalIcon className="w-3.5 h-3.5" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span className="max-w-[150px] truncate">{tab.title}</span>
          {tab.closeable && (
            <button
              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
