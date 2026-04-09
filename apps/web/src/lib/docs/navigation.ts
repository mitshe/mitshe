import {
  Workflow,
  Plug,
  Code,
  Home,
  Sparkles,
  GitBranch,
  MessageSquare,
  MessageSquareCode,
  SlidersHorizontal,
  Terminal,
  Zap,
  Box,
  SquareKanban,
  Gitlab,
  BookOpen,
} from "lucide-react";

export type DocNavItem = {
  title: string;
  slug: string;
  icon: typeof Home;
};

export type DocNavSection = {
  title: string;
  items: DocNavItem[];
};

export const docsNav: DocNavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", slug: "", icon: Home },
      { title: "Quick Start", slug: "quickstart", icon: Zap },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "What are Workflows?", slug: "workflows", icon: Workflow },
      { title: "Nodes & Connections", slug: "workflows/nodes", icon: Box },
      { title: "AI Nodes", slug: "workflows/ai-nodes", icon: Sparkles },
      {
        title: "Variables & Expressions",
        slug: "workflows/expressions",
        icon: Code,
      },
      {
        title: "Session Nodes",
        slug: "workflows/session-nodes",
        icon: MessageSquareCode,
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        title: "Overview",
        slug: "workspace",
        icon: Terminal,
      },
      {
        title: "Sessions",
        slug: "workspace/sessions",
        icon: MessageSquareCode,
      },
      {
        title: "Presets",
        slug: "workspace/presets",
        icon: SlidersHorizontal,
      },
      {
        title: "Environments",
        slug: "workspace/environments",
        icon: Box,
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Overview", slug: "integrations", icon: Plug },
      { title: "GitHub", slug: "integrations/github", icon: GitBranch },
      { title: "GitLab", slug: "integrations/gitlab", icon: Gitlab },
      { title: "Jira", slug: "integrations/jira", icon: SquareKanban },
      { title: "YouTrack", slug: "integrations/youtrack", icon: SquareKanban },
      { title: "Slack", slug: "integrations/slack", icon: MessageSquare },
      { title: "Obsidian", slug: "integrations/obsidian", icon: BookOpen },
      {
        title: "Claude Code",
        slug: "integrations/claude-code",
        icon: Sparkles,
      },
      {
        title: "OpenClaw",
        slug: "integrations/openclaw",
        icon: Terminal,
      },
    ],
  },
  {
    title: "API",
    items: [{ title: "API Reference", slug: "api", icon: Code }],
  },
  {
    title: "Deployment",
    items: [
      { title: "Docker", slug: "deployment/docker", icon: Box },
      { title: "Development", slug: "deployment/development", icon: Code },
    ],
  },
];

export const flatNav = docsNav.flatMap((section) => section.items);

export function getNavItem(slug: string) {
  return flatNav.find((item) => item.slug === slug);
}

export function getNavSection(slug: string) {
  return docsNav.find((s) => s.items.some((i) => i.slug === slug));
}

export function getPrevNext(slug: string) {
  const currentIndex = flatNav.findIndex((item) => item.slug === slug);
  return {
    prev: currentIndex > 0 ? flatNav[currentIndex - 1] : null,
    next: currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null,
  };
}
