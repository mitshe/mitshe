"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { CommandPalette } from "@/components/app/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthContext } from "@/lib/auth";

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { userName, userEmail, signOut } = useAuthContext();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link
          href="/chat"
          className="flex md:hidden items-center gap-2 font-semibold"
        >
          <img src="/logo.svg" alt="mitshe" className="h-8 w-8" />
        </Link>

        <button
          onClick={() => setCommandOpen(true)}
          className="relative hidden sm:flex w-64 items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border">
            ⌘K
          </kbd>
        </button>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <div className="flex items-center gap-2 rounded-md border px-2 sm:px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">{userName || userEmail}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 h-14 flex flex-row items-center">
            <SheetTitle className="flex items-center gap-2">
              <span className="font-semibold">mitshe</span>
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-4">
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
