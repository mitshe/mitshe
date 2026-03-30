"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Menu, User, LogOut } from "lucide-react";
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

// Dynamically import Clerk components to avoid loading them when not needed
const OrganizationSwitcher = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.OrganizationSwitcher),
  { ssr: false, loading: () => <div className="h-8 w-24 animate-pulse bg-muted rounded" /> }
);

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false, loading: () => <div className="h-8 w-8 animate-pulse bg-muted rounded-full" /> }
);

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { isClerkMode, isSelfhostedMode, userName, userEmail, signOut } = useAuthContext();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
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
          href="/dashboard"
          className="flex md:hidden items-center gap-2 font-semibold"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs">
            AI
          </div>
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

        {isClerkMode ? (
          <>
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger:
                    "flex items-center gap-2 rounded-md border px-2 sm:px-3 py-1.5 text-sm hover:bg-accent",
                },
              }}
            />
            <div data-tour="user-menu">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-md border px-2 sm:px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">{userName || userEmail}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
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
