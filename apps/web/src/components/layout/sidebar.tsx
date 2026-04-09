"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  MessageSquareCode,
  SlidersHorizontal,
  Box,
  Workflow,
  History,
  Plug,
  Bot,
  GitBranch,
  Building2,
  Users,
  Key,
  Settings,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const coreNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tourId: "nav-dashboard",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    tourId: "nav-projects",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: ListTodo,
    tourId: "nav-tasks",
  },
  {
    title: "Workflows",
    href: "/workflows",
    icon: Workflow,
    tourId: "nav-workflows",
  },
  {
    title: "Executions",
    href: "/executions",
    icon: History,
    tourId: "nav-executions",
  },
];

const workspaceNavItems = [
  {
    title: "Sessions",
    href: "/sessions",
    icon: MessageSquareCode,
    tourId: "nav-sessions",
  },
  {
    title: "Presets",
    href: "/presets",
    icon: SlidersHorizontal,
    tourId: "nav-presets",
  },
  {
    title: "Environments",
    href: "/environments",
    icon: Box,
    tourId: "nav-environments",
  },
];

const connectNavItems = [
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
    tourId: "nav-integrations",
  },
  {
    title: "AI Providers",
    href: "/settings/ai",
    icon: Bot,
    tourId: "nav-ai",
  },
  {
    title: "Repositories",
    href: "/settings/repositories",
    icon: GitBranch,
    tourId: "nav-repositories",
  },
];

const settingsNavItems = [
  {
    title: "Organization",
    href: "/settings",
    icon: Building2,
    tourId: "nav-organization",
  },
  {
    title: "Team",
    href: "/settings/team",
    icon: Users,
    tourId: "nav-team",
  },
  {
    title: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
    tourId: "nav-api-keys",
  },
  {
    title: "Preferences",
    href: "/settings/preferences",
    icon: Settings,
    tourId: "nav-preferences",
  },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Special handling for /settings (exact match only)
    if (href === "/settings") {
      return pathname === "/settings";
    }
    // Special handling for /executions to match workflow execution pages
    if (href === "/executions") {
      return pathname === "/executions" || pathname.includes("/executions");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Core Navigation */}
      <div className="space-y-1">
        {coreNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive(item.href) && "bg-secondary",
            )}
            asChild
            onClick={onNavigate}
            data-tour={item.tourId}
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      {/* Workspace Section */}
      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workspace
        </p>
        {workspaceNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive(item.href) && "bg-secondary",
            )}
            asChild
            onClick={onNavigate}
            data-tour={item.tourId}
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      {/* Connect Section */}
      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Connect
        </p>
        {connectNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive(item.href) && "bg-secondary",
            )}
            asChild
            onClick={onNavigate}
            data-tour={item.tourId}
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      {/* Settings Section */}
      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Settings
        </p>
        {settingsNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive(item.href) && "bg-secondary",
            )}
            asChild
            onClick={onNavigate}
            data-tour={item.tourId}
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      {/* Documentation Link */}
      <div className="mt-6">
        <Separator className="mb-4" />
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          asChild
          onClick={onNavigate}
        >
          <Link href="/docs" target="_blank">
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
            <ExternalLink className="ml-auto h-3 w-3" />
          </Link>
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <div className="hidden md:flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <img src="/logo.svg" alt="mitshe" className="h-8 w-8" />
          <span className="font-brand">mitshe</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <SidebarContent />
      </ScrollArea>
    </div>
  );
}
