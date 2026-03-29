"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Map paths to human-readable labels
const pathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  workflows: "Workflows",
  executions: "Executions",
  projects: "Projects",
  settings: "Organization",
  integrations: "Integrations",
  ai: "AI Providers",
  repositories: "Repositories",
  team: "Team",
  "api-keys": "API Keys",
  preferences: "Preferences",
  edit: "Edit",
  docs: "Documentation",
};

// Dynamic segment patterns (for IDs)
function isDynamicSegment(segment: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  // CUID pattern (starts with c, 25+ chars)
  if (/^c[a-z0-9]{24,}$/i.test(segment)) {
    return true;
  }
  // Prisma CUID (starts with cm)
  if (segment.startsWith("cm") && segment.length > 20) {
    return true;
  }
  return false;
}

export function BreadcrumbsWrapper() {
  const pathname = usePathname();

  // Don't show breadcrumbs on dashboard home
  if (pathname === "/dashboard") {
    return null;
  }

  // Parse the path into segments
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip dynamic segments in the middle, but include the final one
    if (isDynamicSegment(segment)) {
      if (i === segments.length - 1) {
        // Last segment is dynamic - show as "Details" or based on previous segment
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
        href="/dashboard"
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
