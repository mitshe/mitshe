"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import pkg from "../../../../package.json";

const webVersion = pkg.version;
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

const setupLinks = [
  {
    title: "AI Providers",
    description: "API keys for Claude, OpenAI, OpenRouter, Gemini",
    href: "/settings/ai",
    icon: Bot,
  },
  {
    title: "Integrations",
    description: "Connect GitHub, GitLab, Jira, Slack and more",
    href: "/settings/integrations",
    icon: Plug,
  },
  {
    title: "Repositories",
    description: "Sync and manage Git repositories",
    href: "/settings/repositories",
    icon: GitBranch,
  },
];

const adminLinks = [
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
    description: "Theme, language, and display options",
    href: "/settings/preferences",
    icon: Settings,
  },
];

function SettingsGroup({ label, items }: { label: string; items: typeof setupLinks }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
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

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your integrations, providers, team, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsGroup label="Setup" items={setupLinks} />
        <SettingsGroup label="Administration" items={adminLinks} />
      </div>

      <VersionInfo />
    </div>
  );
}

function VersionInfo() {
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiUrl}/health`)
      .then((r) => r.json())
      .then((d) => setApiVersion(d.version))
      .catch(() => {});

    if (typeof window !== "undefined" && window.mitsheDesktop?.getVersion) {
      window.mitsheDesktop.getVersion().then((v: string) => setDesktopVersion(v)).catch(() => {});
    }
  }, []);

  return (
    <div className="pt-4 border-t text-xs text-muted-foreground/60 flex flex-wrap gap-x-4 gap-y-1">
      <span>Web v{webVersion}</span>
      {apiVersion && <span>API v{apiVersion}</span>}
      {desktopVersion && <span>Desktop v{desktopVersion}</span>}
    </div>
  );
}
