"use client";

import { useAuth } from "@/lib/auth";

export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (projectId?: string) =>
      [...queryKeys.tasks.all, "list", { projectId }] as const,
    detail: (id: string) => [...queryKeys.tasks.all, "detail", id] as const,
  },
  workflows: {
    all: ["workflows"] as const,
    list: (projectId?: string) =>
      [...queryKeys.workflows.all, "list", { projectId }] as const,
    detail: (id: string) => [...queryKeys.workflows.all, "detail", id] as const,
    executions: (id: string) =>
      [...queryKeys.workflows.all, "executions", id] as const,
    executionDetail: (workflowId: string, executionId: string) =>
      [
        ...queryKeys.workflows.all,
        "execution",
        workflowId,
        executionId,
      ] as const,
    templates: () => [...queryKeys.workflows.all, "templates"] as const,
    template: (id: string) =>
      [...queryKeys.workflows.all, "template", id] as const,
  },
  integrations: {
    all: ["integrations"] as const,
    list: () => [...queryKeys.integrations.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.integrations.all, "detail", id] as const,
  },
  apiKeys: {
    all: ["apiKeys"] as const,
    list: () => [...queryKeys.apiKeys.all, "list"] as const,
  },
  aiCredentials: {
    all: ["aiCredentials"] as const,
    list: () => [...queryKeys.aiCredentials.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.aiCredentials.all, "detail", id] as const,
  },
  repositories: {
    all: ["repositories"] as const,
    list: (active?: boolean) =>
      [...queryKeys.repositories.all, "list", { active }] as const,
    available: () => [...queryKeys.repositories.all, "available"] as const,
    detail: (id: string) =>
      [...queryKeys.repositories.all, "detail", id] as const,
  },
  sessions: {
    all: ["sessions"] as const,
    list: (status?: string, projectId?: string) =>
      [...queryKeys.sessions.all, "list", { status, projectId }] as const,
    detail: (id: string) =>
      [...queryKeys.sessions.all, "detail", id] as const,
    files: (id: string) =>
      [...queryKeys.sessions.all, "files", id] as const,
  },
  snapshots: {
    all: ["snapshots"] as const,
    list: () => [...queryKeys.snapshots.all, "list"] as const,
    detail: (id: string) => [...queryKeys.snapshots.all, "detail", id] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: () => [...queryKeys.chat.all, "conversations"] as const,
    conversation: (id: string) =>
      [...queryKeys.chat.all, "conversation", id] as const,
  },
  skills: {
    all: ["skills"] as const,
    list: () => [...queryKeys.skills.all, "list"] as const,
    detail: (id: string) => [...queryKeys.skills.all, "detail", id] as const,
  },
};

export function useAuthToken() {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  };
}
