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
  MessageCircle,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tourId: string;
  description?: string;
}

const coreNavItems: NavItem[] = [
  {
    title: "Chat",
    href: "/chat",
    icon: MessageCircle,
    tourId: "nav-chat",
    description: "AI assistant",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tourId: "nav-dashboard",
    description: "Overview & stats",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    tourId: "nav-projects",
    description: "Code repositories",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: ListTodo,
    tourId: "nav-tasks",
    description: "AI-processed work items",
  },
  {
    title: "Workflows",
    href: "/workflows",
    icon: Workflow,
    tourId: "nav-workflows",
    description: "Automation pipelines",
  },
  {
    title: "Executions",
    href: "/executions",
    icon: History,
    tourId: "nav-executions",
    description: "Workflow run history",
  },
];

const workspaceNavItems: NavItem[] = [
  {
    title: "Sessions",
    href: "/sessions",
    icon: MessageSquareCode,
    tourId: "nav-sessions",
    description: "AI agent terminals",
  },
  {
    title: "Presets",
    href: "/presets",
    icon: SlidersHorizontal,
    tourId: "nav-presets",
    description: "Saved session configs",
  },
  {
    title: "Environments",
    href: "/environments",
    icon: Box,
    tourId: "nav-environments",
    description: "Container setup",
  },
  {
    title: "Images",
    href: "/images",
    icon: HardDrive,
    tourId: "nav-images",
    description: "Base container images",
  },
];

const connectNavItems: NavItem[] = [
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
    tourId: "nav-integrations",
    description: "Jira, GitHub, Slack...",
  },
  {
    title: "AI Providers",
    href: "/settings/ai",
    icon: Bot,
    tourId: "nav-ai",
    description: "API keys for AI models",
  },
  {
    title: "Repositories",
    href: "/settings/repositories",
    icon: GitBranch,
    tourId: "nav-repositories",
    description: "Git repos to work on",
  },
];

const settingsNavItems: NavItem[] = [
  {
    title: "Organization",
    href: "/settings",
    icon: Building2,
    tourId: "nav-organization",
    description: "Name & billing",
  },
  {
    title: "Team",
    href: "/settings/team",
    icon: Users,
    tourId: "nav-team",
    description: "Members & roles",
  },
  {
    title: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
    tourId: "nav-api-keys",
    description: "External API access",
  },
  {
    title: "Preferences",
    href: "/settings/preferences",
    icon: Settings,
    tourId: "nav-preferences",
    description: "App settings",
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

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => (
      <Button
        key={item.href}
        variant={isActive(item.href) ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-auto py-1.5",
          isActive(item.href) && "bg-secondary",
        )}
        asChild
        onClick={onNavigate}
        data-tour={item.tourId}
      >
        <Link href={item.href}>
          <item.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span>{item.title}</span>
            {item.description && (
              <span className="text-[10px] text-muted-foreground font-normal">{item.description}</span>
            )}
          </span>
        </Link>
      </Button>
    ));

  return (
    <>
      <div className="space-y-1">
        {renderNavItems(coreNavItems)}
      </div>

      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workspace
        </p>
        {renderNavItems(workspaceNavItems)}
      </div>

      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Connect
        </p>
        {renderNavItems(connectNavItems)}
      </div>

      <div className="mt-6 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Settings
        </p>
        {renderNavItems(settingsNavItems)}
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
      <div className="flex h-14 items-center border-b px-4 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <img src="/logo.svg" alt="mitshe" className="h-8 w-8" />
          <span className="font-brand">mitshe</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarContent />
      </div>
    </div>
  );
}
