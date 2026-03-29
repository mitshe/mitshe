"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  FolderOpen,
  ListTodo,
  Workflow,
  Plus,
  Settings,
  Search,
  Loader2,
} from "lucide-react";
import { useTasks, useProjects, useWorkflows } from "@/lib/api/hooks";
import type { Task, Project, Workflow as WorkflowType } from "@/lib/api/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: Search },
  { label: "Tasks", path: "/tasks", icon: ListTodo },
  { label: "Projects", path: "/projects", icon: FolderOpen },
  { label: "Workflows", path: "/workflows", icon: Workflow },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Integrations", path: "/settings/integrations", icon: Settings },
  { label: "Team", path: "/settings/team", icon: Settings },
  { label: "Billing", path: "/settings/billing", icon: Settings },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();

  const isLoading = tasksLoading || projectsLoading || workflowsLoading;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (path: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(path);
    },
    [router, onOpenChange],
  );

  const filteredTasks = useMemo(() => {
    if (!query) return tasks.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return tasks
      .filter(
        (task: Task) =>
          task.title.toLowerCase().includes(lowerQuery) ||
          task.description?.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 8);
  }, [tasks, query]);

  const filteredProjects = useMemo(() => {
    if (!query) return projects.slice(0, 3);
    const lowerQuery = query.toLowerCase();
    return projects
      .filter(
        (project: Project) =>
          project.name.toLowerCase().includes(lowerQuery) ||
          project.description?.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 5);
  }, [projects, query]);

  const filteredWorkflows = useMemo(() => {
    if (!query) return workflows.slice(0, 3);
    const lowerQuery = query.toLowerCase();
    return workflows
      .filter(
        (workflow: WorkflowType) =>
          workflow.name.toLowerCase().includes(lowerQuery) ||
          workflow.description?.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 5);
  }, [workflows, query]);

  const quickActions = [
    {
      label: "New Task",
      icon: Plus,
      shortcut: "T",
      action: () => handleSelect("/tasks?create=true"),
    },
    {
      label: "New Project",
      icon: Plus,
      shortcut: "P",
      action: () => handleSelect("/projects?create=true"),
    },
    {
      label: "New Workflow",
      icon: Plus,
      shortcut: "W",
      action: () => handleSelect("/workflows?create=true"),
    },
  ];

  const filteredNavigation = useMemo(() => {
    if (!query) return navigationItems;
    const lowerQuery = query.toLowerCase();
    return navigationItems.filter((item) =>
      item.label.toLowerCase().includes(lowerQuery),
    );
  }, [query]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search tasks, projects, workflows and more..."
    >
      <CommandInput
        placeholder="Search tasks, projects, workflows..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            {!query && (
              <>
                <CommandGroup heading="Quick Actions">
                  {quickActions.map((action) => (
                    <CommandItem
                      key={action.label}
                      onSelect={action.action}
                      className="cursor-pointer"
                    >
                      <action.icon className="mr-2 w-4 h-4" />
                      {action.label}
                      <CommandShortcut>⌘{action.shortcut}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {filteredNavigation.length > 0 && (
              <>
                <CommandGroup heading="Navigation">
                  {filteredNavigation.map((item) => (
                    <CommandItem
                      key={item.path}
                      value={`nav-${item.label}`}
                      onSelect={() => handleSelect(item.path)}
                      className="cursor-pointer"
                    >
                      <item.icon className="mr-2 w-4 h-4" />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {!query && <CommandSeparator />}
              </>
            )}

            {filteredTasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {filteredTasks.map((task: Task) => (
                  <CommandItem
                    key={task.id}
                    value={`task-${task.id}-${task.title}`}
                    onSelect={() => handleSelect(`/tasks/${task.id}`)}
                    className="cursor-pointer"
                  >
                    <ListTodo className="mr-2 w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{task.title}</span>
                      {task.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredProjects.length > 0 && (
              <CommandGroup heading="Projects">
                {filteredProjects.map((project: Project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}-${project.name}`}
                    onSelect={() => handleSelect(`/projects/${project.id}`)}
                    className="cursor-pointer"
                  >
                    <FolderOpen className="mr-2 w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredWorkflows.length > 0 && (
              <CommandGroup heading="Workflows">
                {filteredWorkflows.map((workflow: WorkflowType) => (
                  <CommandItem
                    key={workflow.id}
                    value={`workflow-${workflow.id}-${workflow.name}`}
                    onSelect={() =>
                      handleSelect(`/workflows/${workflow.id}/executions`)
                    }
                    className="cursor-pointer"
                  >
                    <Workflow className="mr-2 w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{workflow.name}</span>
                      {workflow.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {workflow.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
