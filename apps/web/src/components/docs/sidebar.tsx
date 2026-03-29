"use client";

import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { docsNav } from "@/lib/docs/navigation";

interface SidebarProps {
  currentSlug: string;
  onSearchClick?: () => void;
}

export function Sidebar({ currentSlug, onSearchClick }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b">
        <Link href="/docs" className="flex items-center gap-2">
          <span className="font-semibold">mitshe</span>
          <span className="text-xs text-muted-foreground">Docs</span>
        </Link>
      </div>

      <div className="p-4 border-b">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border">
            ⌘K
          </kbd>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-6">
          {docsNav.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h4>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = currentSlug === item.slug;
                  const Icon = item.icon;
                  return (
                    <li key={item.slug}>
                      <Link
                        href={`/docs/${item.slug}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>
      </div>
    </div>
  );
}
