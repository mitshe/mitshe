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
  CreateAgentDefinitionDto,
  UpdateAgentDefinitionDto,
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
  CreateSessionDto,
  UpdateSessionMetadataDto,
  RecreateSessionDto,
  CreateBaseImageDto,
  CreateConversationDto,
  SendMessageDto,
} from "./types";

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
  presets: {
    all: ["presets"] as const,
    list: () => [...queryKeys.presets.all, "list"] as const,
    detail: (id: string) => [...queryKeys.presets.all, "detail", id] as const,
  },
  environments: {
    all: ["environments"] as const,
    list: () => [...queryKeys.environments.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.environments.all, "detail", id] as const,
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
  images: {
    all: ["images"] as const,
    list: () => [...queryKeys.images.all, "list"] as const,
    detail: (id: string) => [...queryKeys.images.all, "detail", id] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: () => [...queryKeys.chat.all, "conversations"] as const,
    conversation: (id: string) =>
      [...queryKeys.chat.all, "conversation", id] as const,
  },
};

function useAuthToken() {
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

export function useTestAICredential() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.aiCredentials.test(id, token);
    },
  });
}

export function useTestAICredentialBeforeConnect() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (data: { provider: string; apiKey?: string }) => {
      const token = await getToken();
      return api.aiCredentials.testBeforeConnect(data, token);
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

export function useBulkDeleteRepositories() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken();
      return api.repositories.bulkDelete(ids, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useRemoteRepositories() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const { repositories } = await api.repositories.listRemote(token);
      return repositories;
    },
  });
}

export function useSyncExistingRepositories() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await api.repositories.syncExisting(token);
      return response.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useSyncOneRepository() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.repositories.syncOne(id, token);
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
      const response = await api.repositories.syncAll(token);
      return response.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

export function useSyncSelectiveRepositories() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      integrationId: string;
      externalIds: string[];
    }) => {
      const token = await getToken();
      return api.repositories.syncSelective(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
}

// =========================================================================
// Sessions
// =========================================================================

export function useSessions(status?: string, projectId?: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.sessions.list(status, projectId),
    queryFn: async () => {
      const token = await getToken();
      const { sessions } = await api.sessions.list(token, status, projectId);
      return sessions;
    },
  });
}

export function useSession(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { session } = await api.sessions.get(id, token);
      return session;
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSessionDto) => {
      const token = await getToken();
      const { session } = await api.sessions.create(data, token);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useUpdateSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSessionMetadataDto;
    }) => {
      const token = await getToken();
      const { session } = await api.sessions.update(id, data, token);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useRecreateSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: RecreateSessionDto;
    }) => {
      const token = await getToken();
      const { session } = await api.sessions.recreate(id, data, token);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useDeleteSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.sessions.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useStartTerminal() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async ({
      sessionId,
      terminalId,
      cmd,
    }: {
      sessionId: string;
      terminalId?: string;
      cmd?: string[];
    }) => {
      const token = await getToken();
      return api.sessions.startTerminal(sessionId, token, {
        terminalId,
        cmd,
      });
    },
  });
}

export function useCloseTerminal() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async ({
      sessionId,
      terminalId,
    }: {
      sessionId: string;
      terminalId: string;
    }) => {
      const token = await getToken();
      return api.sessions.closeTerminal(sessionId, terminalId, token);
    },
  });
}

export function usePauseSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.sessions.pause(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useResumeSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.sessions.resume(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useStopSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.sessions.stop(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useCloneSession() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const { session } = await api.sessions.clone(id, token);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useSessionFiles(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.sessions.files(id),
    queryFn: async () => {
      const token = await getToken();
      const { files } = await api.sessions.getFiles(id, token);
      return files;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export function useSessionGitStatus(id: string) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: [...queryKeys.sessions.detail(id), "git-status"],
    queryFn: async () => {
      const token = await getToken();
      const { statuses } = await api.sessions.getGitStatus(id, token);
      return statuses;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useReadSessionFile() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      const token = await getToken();
      return api.sessions.readFile(id, path, token);
    },
  });
}

export function useDeleteSessionFile() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      const token = await getToken();
      return api.sessions.deleteFile(id, path, token);
    },
  });
}

export function useWriteSessionFile() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async ({
      id,
      path,
      content,
    }: {
      id: string;
      path: string;
      content: string;
    }) => {
      const token = await getToken();
      return api.sessions.writeFile(id, path, content, token);
    },
  });
}

// =========================================================================
// Agents
// =========================================================================

export function usePresets() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.presets.list(),
    queryFn: async () => {
      const token = await getToken();
      const { agents } = await api.presets.list(token);
      return agents;
    },
  });
}

export function useCreatePreset() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAgentDefinitionDto) => {
      const token = await getToken();
      const { agent } = await api.presets.create(data, token);
      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.presets.all });
    },
  });
}

export function useUpdatePreset() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAgentDefinitionDto;
    }) => {
      const token = await getToken();
      const { agent } = await api.presets.update(id, data, token);
      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.presets.all });
    },
  });
}

export function useDeletePreset() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.presets.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.presets.all });
    },
  });
}

// =========================================================================
// Environments
// =========================================================================

export function useEnvironments() {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.environments.list(),
    queryFn: async () => {
      const token = await getToken();
      const { environments } = await api.environments.list(token);
      return environments;
    },
  });
}

export function useCreateEnvironment() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEnvironmentDto) => {
      const token = await getToken();
      const { environment } = await api.environments.create(data, token);
      return environment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.all });
    },
  });
}

export function useUpdateEnvironment() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEnvironmentDto;
    }) => {
      const token = await getToken();
      const { environment } = await api.environments.update(id, data, token);
      return environment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.all });
    },
  });
}

export function useDeleteEnvironment() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.environments.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.all });
    },
  });
}

// ============================================================================
// BASE IMAGES
// ============================================================================

export function useImages() {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.images.list(),
    queryFn: async () => {
      const token = await getToken();
      const { images } = await api.images.list(token);
      return images;
    },
  });
}

export function useImage(id: string) {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.images.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { image } = await api.images.get(id, token);
      return image;
    },
    enabled: !!id,
  });
}

export function useCreateImage() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBaseImageDto) => {
      const token = await getToken();
      const { image } = await api.images.create(data, token);
      return image;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
    },
  });
}

export function useDeleteImage() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.images.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
    },
  });
}

// ============================================================================
// CHAT
// ============================================================================

export function useChatConversations() {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: async () => {
      const token = await getToken();
      const { conversations } = await api.chat.listConversations(token);
      return conversations;
    },
  });
}

export function useChatConversation(id: string) {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: async () => {
      const token = await getToken();
      const { conversation } = await api.chat.getConversation(id, token);
      return conversation;
    },
    enabled: !!id,
  });
}

export function useCreateChatConversation() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationDto) => {
      const token = await getToken();
      const { conversation } = await api.chat.createConversation(data, token);
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useDeleteChatConversation() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.chat.deleteConversation(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useSendChatMessage() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: SendMessageDto;
    }) => {
      const token = await getToken();
      return api.chat.sendMessage(conversationId, data, token);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });
}
