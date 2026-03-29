"use client";

import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateApiKeyDto,
  ImportPreviewDto,
  ImportConfirmDto,
  RunWorkflowDto,
  CreateAICredentialDto,
  UpdateAICredentialDto,
  UpdateRepositoryDto,
  BulkUpdateRepositoriesDto,
  CreateFromTemplateDto,
} from "./types";

// Check if running in local mode (set at build time)
const isLocalMode = process.env.NEXT_PUBLIC_AUTH_MODE === "local";

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
};

function useAuthToken() {
  // In local mode, return null token (backend doesn't require auth)
  if (isLocalMode) {
    return async () => null as unknown as string;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  };
}

export function useProjects() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const token = await getToken();
      const { projects } = await api.projects.list(token);
      return projects;
    },
  });
}

export function useProject(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { project } = await api.projects.get(id, token);
      return project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectDto) => {
      const token = await getToken();
      const { project } = await api.projects.create(data, token);
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectDto;
    }) => {
      const token = await getToken();
      const { project } = await api.projects.update(id, data, token);
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
    },
  });
}

export function useDeleteProject() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.projects.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useTasks(projectId?: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.tasks.list(projectId),
    queryFn: async () => {
      const token = await getToken();
      const response = await api.tasks.list(token, projectId);
      return response.data ?? [];
    },
  });
}

export function useTask(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { task } = await api.tasks.get(id, token);
      return task;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskDto) => {
      const token = await getToken();
      const { task } = await api.tasks.create(data, token);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateTask() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskDto }) => {
      const token = await getToken();
      const { task } = await api.tasks.update(id, data, token);
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },
  });
}

export function useDeleteTask() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.tasks.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useProcessTask() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const { task } = await api.tasks.process(id, token);
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },
  });
}

export function useImportPreview() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (data: ImportPreviewDto) => {
      const token = await getToken();
      const { preview } = await api.tasks.importPreview(data, token);
      return preview;
    },
  });
}

export function useImportConfirm() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportConfirmDto) => {
      const token = await getToken();
      const { task } = await api.tasks.importConfirm(data, token);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useRefreshExternalData() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const { task } = await api.tasks.refreshExternalData(id, token);
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },
  });
}

export function useRunWorkflowOnTask() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: RunWorkflowDto;
    }) => {
      const token = await getToken();
      return api.tasks.runWorkflow(taskId, data, token);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.executions(result.workflowId),
      });
    },
  });
}

export function useWorkflows(projectId?: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.workflows.list(projectId),
    queryFn: async () => {
      const token = await getToken();
      const response = await api.workflows.list(token, projectId);
      return response.data ?? [];
    },
  });
}

export function useWorkflow(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.workflows.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { workflow } = await api.workflows.get(id, token);
      return workflow;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkflowDto) => {
      const token = await getToken();
      const { workflow } = await api.workflows.create(data, token);
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}

export function useUpdateWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWorkflowDto;
    }) => {
      const token = await getToken();
      const { workflow } = await api.workflows.update(id, data, token);
      return workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      queryClient.setQueryData(
        queryKeys.workflows.detail(workflow.id),
        workflow,
      );
    },
  });
}

export function useDeleteWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.workflows.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}

export function useActivateWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const { workflow } = await api.workflows.activate(id, token);
      return workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      queryClient.setQueryData(
        queryKeys.workflows.detail(workflow.id),
        workflow,
      );
    },
  });
}

export function useDeactivateWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const { workflow } = await api.workflows.deactivate(id, token);
      return workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      queryClient.setQueryData(
        queryKeys.workflows.detail(workflow.id),
        workflow,
      );
    },
  });
}

export function useRunWorkflow() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      triggerData = {},
    }: {
      id: string;
      triggerData?: Record<string, unknown>;
    }) => {
      const token = await getToken();
      return api.workflows.run(id, triggerData, token);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.executions(id),
      });
    },
  });
}

export function useWorkflowExecutions(workflowId: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.workflows.executions(workflowId),
    queryFn: async () => {
      const token = await getToken();
      const response = await api.workflows.getExecutions(workflowId, token);
      return response.data ?? [];
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((e: { status: string }) => e.status === "running")) {
        return 3000;
      }
      return false;
    },
  });
}

export function useWorkflowExecutionDetails(
  workflowId: string,
  executionId: string,
) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.workflows.executionDetail(workflowId, executionId),
    queryFn: async () => {
      const token = await getToken();
      return api.workflows.getExecutionDetails(workflowId, executionId, token);
    },
    enabled: !!workflowId && !!executionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.execution?.status === "running") {
        return 2000;
      }
      return false;
    },
  });
}

export function useCancelExecution() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      executionId,
    }: {
      workflowId: string;
      executionId: string;
    }) => {
      const token = await getToken();
      return api.workflows.cancelExecution(workflowId, executionId, token);
    },
    onSuccess: (_, { workflowId, executionId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.executions(workflowId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.executionDetail(workflowId, executionId),
      });
    },
  });
}

export function useRetryExecution() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      executionId,
    }: {
      workflowId: string;
      executionId: string;
    }) => {
      const token = await getToken();
      return api.workflows.retryExecution(workflowId, executionId, token);
    },
    onSuccess: (_, { workflowId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.executions(workflowId),
      });
    },
  });
}

export function useWorkflowTemplates() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.workflows.templates(),
    queryFn: async () => {
      const token = await getToken();
      const { templates } = await api.workflows.getTemplates(token);
      return templates;
    },
  });
}

export function useCreateWorkflowFromTemplate() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFromTemplateDto) => {
      const token = await getToken();
      const { workflow } = await api.workflows.createFromTemplate(data, token);
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}

export function useIntegrations() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: async () => {
      const token = await getToken();
      const { integrations } = await api.integrations.list(token);
      return integrations;
    },
  });
}

export function useCreateIntegration() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIntegrationDto) => {
      const token = await getToken();
      const { integration } = await api.integrations.create(data, token);
      return integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}

export function useUpdateIntegration() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateIntegrationDto;
    }) => {
      const token = await getToken();
      const { integration } = await api.integrations.update(id, data, token);
      return integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}

export function useDeleteIntegration() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.integrations.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}

export function useTestIntegration() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.integrations.test(id, token);
    },
  });
}

export function useTestIntegrationBeforeConnect() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (data: CreateIntegrationDto) => {
      const token = await getToken();
      return api.integrations.testBeforeConnect(data, token);
    },
  });
}

export function useWebhookUrl() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: [...queryKeys.integrations.all, "webhook-url"] as const,
    queryFn: async () => {
      const token = await getToken();
      return api.integrations.getWebhookUrl(token);
    },
  });
}

export function useRegenerateWebhookUrl() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.integrations.regenerateWebhookUrl(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.integrations.all, "webhook-url"],
      });
    },
  });
}

export function useApiKeys() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.apiKeys.list(),
    queryFn: async () => {
      const token = await getToken();
      const { apiKeys } = await api.apiKeys.list(token);
      return apiKeys;
    },
  });
}

export function useCreateApiKey() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApiKeyDto) => {
      const token = await getToken();
      return api.apiKeys.create(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useDeleteApiKey() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.apiKeys.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useAICredentials() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.aiCredentials.list(),
    queryFn: async () => {
      const token = await getToken();
      const { credentials } = await api.aiCredentials.list(token);
      return credentials;
    },
  });
}

export function useCreateAICredential() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAICredentialDto) => {
      const token = await getToken();
      const { credential } = await api.aiCredentials.create(data, token);
      return credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiCredentials.all });
    },
  });
}

export function useUpdateAICredential() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAICredentialDto;
    }) => {
      const token = await getToken();
      const { credential } = await api.aiCredentials.update(id, data, token);
      return credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiCredentials.all });
    },
  });
}

export function useDeleteAICredential() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.aiCredentials.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiCredentials.all });
    },
  });
}

export function useRepositories(active?: boolean) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.repositories.list(active),
    queryFn: async () => {
      const token = await getToken();
      const { repositories } = await api.repositories.list(token, active);
      return repositories;
    },
  });
}

export function useAvailableRepositories() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.repositories.available(),
    queryFn: async () => {
      const token = await getToken();
      const { repositories } = await api.repositories.available(token);
      return repositories;
    },
  });
}

export function useRepository(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.repositories.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { repository } = await api.repositories.get(id, token);
      return repository;
    },
    enabled: !!id,
  });
}

export function useUpdateRepository() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRepositoryDto;
    }) => {
      const token = await getToken();
      return api.repositories.update(id, data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useBulkUpdateRepositories() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkUpdateRepositoriesDto) => {
      const token = await getToken();
      return api.repositories.bulkUpdate(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useDeleteRepository() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.repositories.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useSyncRepositories() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId?: string) => {
      const token = await getToken();
      if (integrationId) {
        return api.repositories.syncIntegration(integrationId, token);
      }
      return api.repositories.syncAll(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}
