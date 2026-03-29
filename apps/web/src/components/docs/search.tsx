"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { docsNav } from "@/lib/docs/navigation";
import { docsContent } from "@/lib/docs/content";

interface SearchResult {
  title: string;
  slug: string;
  section: string;
  preview: string;
  icon: React.ElementType;
  score: number;
}

interface DocsSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function searchContent(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const section of docsNav) {
    for (const item of section.items) {
      const content = docsContent[item.slug] || "";
      const lowerContent = content.toLowerCase();
      const lowerTitle = item.title.toLowerCase();

      const titleMatch = lowerTitle.includes(lowerQuery);
      const contentMatch = lowerContent.includes(lowerQuery);

      if (titleMatch || contentMatch) {
        let score = 0;
        if (titleMatch) {
          if (lowerTitle === lowerQuery) {
            score = 100;
          } else if (lowerTitle.startsWith(lowerQuery)) {
            score = 80;
          } else {
            score = 60;
          }
        } else if (contentMatch) {
          score = 20;
        }

        let preview = "";
        if (titleMatch) {
          const firstLine = content
            .split("\n")
            .find((l) => l.trim() && !l.startsWith("#"));
          preview = firstLine?.replace(/[#*`\[\]]/g, "").slice(0, 100) || "";
        } else {
          const matchIndex = lowerContent.indexOf(lowerQuery);
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 40);
            const end = Math.min(
              content.length,
              matchIndex + query.length + 60,
            );
            preview = content
              .slice(start, end)
              .replace(/[#*`\[\]]/g, "")
              .trim();
            if (start > 0) preview = "..." + preview;
            if (end < content.length) preview = preview + "...";
          }
        }

        results.push({
          title: item.title,
          slug: item.slug,
          section: section.title,
          preview,
          icon: item.icon,
          score,
        });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 10);
}

export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchContent(query), [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (slug: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(`/docs/${slug}`);
    },
    [router, onOpenChange],
  );

  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.section]) {
        acc[result.section] = [];
      }
      acc[result.section].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search documentation..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedResults).map(([section, items]) => (
          <CommandGroup key={section} heading={section}>
            {items.map((result) => {
              const Icon = result.icon;
              return (
                <CommandItem
                  key={result.slug}
                  value={`${result.title} ${result.preview}`}
                  onSelect={() => handleSelect(result.slug)}
                  className="flex flex-col items-start gap-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{result.title}</span>
                  </div>
                  {result.preview && (
                    <span className="text-xs text-muted-foreground line-clamp-1 pl-6">
                      {result.preview}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        {!query && (
          <>
            {docsNav.map((section) => (
              <CommandGroup key={section.title} heading={section.title}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.slug}
                      value={item.title}
                      onSelect={() => handleSelect(item.slug)}
                      className="cursor-pointer"
                    >
                      <Icon className="mr-2 w-4 h-4" />
                      {item.title}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
