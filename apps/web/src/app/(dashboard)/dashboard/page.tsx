"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ListTodo,
  FolderKanban,
  Plug,
  GitBranch,
  Workflow,
  Play,
  Sparkles,
  MessageSquareCode,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "@/lib/utils";
import {
  useTasks,
  useSessions,
  useProjects,
  useWorkflows,
  useIntegrations,
  useRepositories,
} from "@/lib/api/hooks";
import { getTaskStatus } from "@/lib/status-config";

export default function DashboardPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();
  const { data: integrations = [], isLoading: integrationsLoading } =
    useIntegrations();
  const { data: repositories = [], isLoading: repositoriesLoading } =
    useRepositories();

  const isLoading =
    tasksLoading ||
    sessionsLoading ||
    projectsLoading ||
    workflowsLoading ||
    integrationsLoading ||
    repositoriesLoading;

  const hasIntegration = integrations.some((i) => i.status === "CONNECTED");
  const hasRepository = repositories.length > 0;
  const hasWorkflow = workflows.length > 0;
  const hasRun = workflows.some((w) => (w._count?.executions ?? 0) > 0);

  const onboardingSteps = [
    {
      id: "integration",
      label: "Connect an integration",
      description: "GitHub, GitLab, Jira, or Slack",
      done: hasIntegration,
      href: "/settings/integrations",
      icon: Plug,
      required: true,
    },
    {
      id: "workflow",
      label: "Create a workflow",
      description: "Build your first automation",
      done: hasWorkflow,
      href: "/workflows",
      icon: Workflow,
      required: true,
    },
    {
      id: "run",
      label: "Run a workflow",
      description: "Execute and test your workflow",
      done: hasRun,
      href: "/workflows",
      icon: Play,
      required: true,
    },
    {
      id: "repository",
      label: "Sync repositories",
      description: "Optional: Import Git repos for code automation",
      done: hasRepository,
      href: "/settings/repositories",
      icon: GitBranch,
      required: false,
    },
  ];

  const requiredSteps = onboardingSteps.filter((s) => s.required);
  const completedRequiredSteps = requiredSteps.filter((s) => s.done).length;
  const onboardingProgress = (completedRequiredSteps / requiredSteps.length) * 100;
  const showOnboarding = completedRequiredSteps < requiredSteps.length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "ANALYZING",
  ).length;
  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;
  const successRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const _activeSessions = sessions.filter(
    (s) => s.status === "RUNNING" || s.status === "PAUSED",
  ).length;

  const recentTasks = tasks.slice(0, 5);
  const _recentSessions = sessions.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div data-tour="dashboard">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your AI task automation
        </p>
      </div>

      {showOnboarding && (
        <Card
          className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
          data-tour="getting-started"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>Getting Started</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedRequiredSteps}/{requiredSteps.length} completed
              </span>
            </div>
            <Progress value={onboardingProgress} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {onboardingSteps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    step.done
                      ? "bg-muted/50 border-muted"
                      : step.required
                        ? "hover:bg-accent hover:border-accent-foreground/20"
                        : "border-dashed hover:bg-accent/50"
                  }`}
                >
                  <div
                    className={`mt-0.5 ${step.done ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}
                    >
                      {step.label}
                      {!step.required && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (optional)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ListTodo className="h-4 w-4" />
          <span>Tasks</span>
          <span className="font-semibold text-foreground">{totalTasks}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Completed</span>
          <span className="font-semibold text-foreground">
            {completedTasks}
          </span>
          <span className="text-xs">({successRate}%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4 text-blue-500" />
          <span>In Progress</span>
          <span className="font-semibold text-foreground">
            {inProgressTasks}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Pending</span>
          <span className="font-semibold text-foreground">{pendingTasks}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FolderKanban className="h-4 w-4" />
          <span>Projects</span>
          <span className="font-semibold text-foreground">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Workflow className="h-4 w-4" />
          <span>Active Workflows</span>
          <span className="font-semibold text-foreground">
            {activeWorkflows}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Workflow className="h-4 w-4 text-blue-500" />
          <span>Executions</span>
          <span className="font-semibold text-foreground">
            {workflows.reduce((sum: number, w: { _count?: { executions?: number } }) => sum + (w._count?.executions ?? 0), 0)}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm sm:text-base">
                No tasks yet. Connect an issue tracker or create a task
                manually.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => (window.location.href = `/tasks/${task.id}`)}
                      >
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTaskStatus(task.status).color}>
                            {getTaskStatus(task.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {formatDistanceToNow(new Date(task.createdAt))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
