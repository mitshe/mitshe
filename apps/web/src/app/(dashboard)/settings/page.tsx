"use client";

import Link from "next/link";
import {
  Plug,
  Bot,
  GitBranch,
  Building2,
  Users,
  Key,
  Settings,
  ChevronRight,
} from "lucide-react";

const settingsLinks = [
  {
    title: "Integrations",
    description: "Connect GitHub, GitLab, Jira, Slack and more",
    href: "/settings/integrations",
    icon: Plug,
  },
  {
    title: "AI Providers",
    description: "API keys for Claude, OpenAI, OpenRouter, Gemini",
    href: "/settings/ai",
    icon: Bot,
  },
  {
    title: "Repositories",
    description: "Sync and manage Git repositories",
    href: "/settings/repositories",
    icon: GitBranch,
  },
  {
    title: "Organization",
    description: "Name, slug, and organization settings",
    href: "/settings/organization",
    icon: Building2,
  },
  {
    title: "Team",
    description: "Members, roles, and invitations",
    href: "/settings/team",
    icon: Users,
  },
  {
    title: "API Keys",
    description: "External API access for automation",
    href: "/settings/api-keys",
    icon: Key,
  },
  {
    title: "Preferences",
    description: "App settings and customization",
    href: "/settings/preferences",
    icon: Settings,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your integrations, providers, team, and preferences.
        </p>
      </div>

      <div className="space-y-2">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-muted">
              <item.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
