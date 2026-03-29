"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronRight,
  Menu,
  Search,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { flatNav, getNavSection } from "@/lib/docs/navigation";
import { docsContent } from "@/lib/docs/content";
import { extractHeadings } from "@/lib/docs/parser";
import {
  Sidebar,
  TableOfContents,
  MarkdownRenderer,
  DocsSearch,
} from "@/components/docs";

export default function DocsPage() {
  const params = useParams();
  const slugArray = (params.slug as string[]) || [];
  const currentSlug = slugArray.join("/");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const content = docsContent[currentSlug] || docsContent[""];
  const headings = useMemo(() => extractHeadings(content), [content]);

  const currentIndex = flatNav.findIndex((item) => item.slug === currentSlug);
  const prevPage = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const nextPage =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;
  const currentPage = flatNav.find((item) => item.slug === currentSlug);

  const section = getNavSection(currentSlug);

  return (
    <div className="flex h-screen">
      <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Desktop sidebar */}
      <aside className="w-64 border-r hidden lg:block overflow-y-auto sticky top-0 h-screen">
        <Sidebar
          currentSlug={currentSlug}
          onSearchClick={() => setSearchOpen(true)}
        />
      </aside>

      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Menu className="w-4 h-4" />
                <span className="text-sm">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <Sidebar
                currentSlug={currentSlug}
                onSearchClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
              />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto lg:pt-0 pt-12">
        <div className="max-w-6xl mx-auto flex">
          <div className="flex-1 min-w-0 px-6 lg:px-12 py-8">
            {/* Breadcrumb */}
            {currentSlug && (
              <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link
                  href="/docs"
                  className="hover:text-foreground transition-colors"
                >
                  Docs
                </Link>
                {section && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-muted-foreground">
                      {section.title}
                    </span>
                  </>
                )}
                {currentPage && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-foreground">{currentPage.title}</span>
                  </>
                )}
              </nav>
            )}

            <article className="max-w-3xl">
              <MarkdownRenderer content={content} />
            </article>

            {/* Prev/Next navigation */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t max-w-3xl">
              {prevPage ? (
                <Link
                  href={`/docs/${prevPage.slug}`}
                  className="group flex flex-col"
                >
                  <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Previous
                  </span>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {prevPage.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {nextPage && (
                <Link
                  href={`/docs/${nextPage.slug}`}
                  className="group flex flex-col items-end"
                >
                  <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    Next <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {nextPage.title}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Table of Contents */}
          {headings.length > 0 && (
            <aside className="hidden xl:block w-56 shrink-0">
              <div className="sticky top-6 pt-8">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
