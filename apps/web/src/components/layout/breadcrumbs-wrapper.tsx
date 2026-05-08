"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathLabels: Record<string, string> = {
  chat: "Chat",
  tasks: "Tasks",
  sessions: "Threads",
  workflows: "Workflows",
  executions: "Executions",
  projects: "Projects",
  images: "Snapshots",
  skills: "Skills",
  settings: "Settings",
  integrations: "Integrations",
  ai: "AI Providers",
  repositories: "Repositories",
  organization: "Organization",
  team: "Team",
  "api-keys": "API Keys",
  preferences: "Preferences",
  edit: "Edit",
  docs: "Documentation",
};

function isDynamicSegment(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  if (/^c[a-z0-9]{24,}$/i.test(segment)) {
    return true;
  }
  if (segment.startsWith("cm") && segment.length > 20) {
    return true;
  }
  return false;
}

export function BreadcrumbsWrapper() {
  const pathname = usePathname();

  if (/^\/workflows\/[^/]+\/edit/.test(pathname) || /^\/sessions\/[^/]+$/.test(pathname) || pathname.startsWith("/chat") || pathname.endsWith("/terminal")) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    if (isDynamicSegment(segment)) {
      if (i === segments.length - 1) {
        const prevSegment = segments[i - 1];
        if (prevSegment === "tasks") {
          breadcrumbs.push({ label: "Task Details" });
        } else if (prevSegment === "workflows") {
          breadcrumbs.push({ label: "Workflow" });
        } else if (prevSegment === "projects") {
          breadcrumbs.push({ label: "Project Details" });
        } else if (prevSegment === "executions") {
          breadcrumbs.push({ label: "Execution Details" });
        } else {
          breadcrumbs.push({ label: "Details" });
        }
      }
      continue;
    }

    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = i === segments.length - 1;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground px-6 pt-4"
    >
      <Link
        href="/chat"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
