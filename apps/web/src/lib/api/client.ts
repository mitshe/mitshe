/**
 * API Client for NestJS Backend
 */

import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  Workflow,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowExecution,
  NodeExecutionResult,
  Integration,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  ApiKey,
  CreateApiKeyDto,
  CreateApiKeyResponse,
  JiraImportPreview,
  ImportPreviewDto,
  ImportConfirmDto,
  RunWorkflowDto,
  AICredential,
  CreateAICredentialDto,
  UpdateAICredentialDto,
  Repository,
  UpdateRepositoryDto,
  BulkUpdateRepositoriesDto,
  RemoteRepository,
  SyncRepositoriesResult,
  SyncAllRepositoriesResult,
  AgentSession,
  CreateSessionDto,
  UpdateSessionMetadataDto,
  RecreateSessionDto,
  WorkflowTemplateMetadata,
  WorkflowTemplate,
  CreateFromTemplateDto,
  Snapshot,
  CreateSnapshotDto,
  UpdateSnapshotDto,
  ChatConversation,
  ChatMessage,
  CreateConversationDto,
  SendMessageDto,
  SendMessageResponse,
  Skill,
  CreateSkillDto,
  UpdateSkillDto,
} from "./types";

// API requests go through Next.js proxy (same-origin, no CORS issues)
// See next.config.ts rewrites: /api/v1/* -> backend
const API_BASE = "/api/v1";

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  projects: {
    list: (token: string) =>
      request<{ projects: Project[] }>("/projects", { token }),

    get: (id: string, token: string) =>
      request<{ project: Project }>(`/projects/${id}`, { token }),

    create: (data: CreateProjectDto, token: string) =>
      request<{ project: Project }>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateProjectDto, token: string) =>
      request<{ project: Project }>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/projects/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  tasks: {
    list: (token: string, projectId?: string) => {
      const params = projectId ? `?projectId=${projectId}` : "";
      return request<{
        data: Task[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/tasks${params}`, { token });
    },

    get: (id: string, token: string) =>
      request<{ task: Task }>(`/tasks/${id}`, { token }),

    create: (data: CreateTaskDto, token: string) =>
      request<{ task: Task }>("/tasks", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateTaskDto, token: string) =>
      request<{ task: Task }>(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/tasks/${id}`, {
        method: "DELETE",
        token,
      }),

    process: (id: string, token: string) =>
      request<{ task: Task }>(`/tasks/${id}/process`, {
        method: "POST",
        token,
      }),

    cancel: (id: string, token: string) =>
      request<{ task: Task }>(`/tasks/${id}/cancel`, {
        method: "POST",
        token,
      }),

    importPreview: (data: ImportPreviewDto, token: string) =>
      request<{ preview: JiraImportPreview }>("/tasks/import/preview", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    importConfirm: (data: ImportConfirmDto, token: string) =>
      request<{ task: Task; message: string }>("/tasks/import/confirm", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    refreshExternalData: (id: string, token: string) =>
      request<{ task: Task; message: string }>(`/tasks/${id}/refresh`, {
        method: "POST",
        token,
      }),

    runWorkflow: (id: string, data: RunWorkflowDto, token: string) =>
      request<{
        executionId: string;
        taskId: string;
        workflowId: string;
        message: string;
      }>(`/tasks/${id}/run-workflow`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
  },

  workflows: {
    list: (token: string, projectId?: string) => {
      const params = projectId ? `?projectId=${projectId}` : "";
      return request<{
        data: Workflow[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/workflows${params}`, {
        token,
      });
    },

    get: (id: string, token: string) =>
      request<{ workflow: Workflow }>(`/workflows/${id}`, { token }),

    create: (data: CreateWorkflowDto, token: string) =>
      request<{ workflow: Workflow }>("/workflows", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateWorkflowDto, token: string) =>
      request<{ workflow: Workflow }>(`/workflows/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/workflows/${id}`, {
        method: "DELETE",
        token,
      }),

    activate: (id: string, token: string) =>
      request<{ workflow: Workflow; message: string }>(
        `/workflows/${id}/activate`,
        {
          method: "POST",
          token,
        },
      ),

    deactivate: (id: string, token: string) =>
      request<{ workflow: Workflow; message: string }>(
        `/workflows/${id}/deactivate`,
        {
          method: "POST",
          token,
        },
      ),

    run: (id: string, triggerData: Record<string, unknown>, token: string) =>
      request<{ executionId: string; message: string }>(
        `/workflows/${id}/run`,
        {
          method: "POST",
          body: JSON.stringify({ triggerData }),
          token,
        },
      ),

    getExecutions: (workflowId: string, token: string) =>
      request<{
        data: WorkflowExecution[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/workflows/${workflowId}/executions`, { token }),

    getExecution: (workflowId: string, executionId: string, token: string) =>
      request<{ execution: WorkflowExecution }>(
        `/workflows/${workflowId}/executions/${executionId}`,
        { token },
      ),

    getExecutionDetails: (
      workflowId: string,
      executionId: string,
      token: string,
    ) =>
      request<{
        execution: WorkflowExecution & {
          workflow?: { name: string; definition: unknown };
        };
        nodeExecutions: NodeExecutionResult[];
      }>(`/workflows/${workflowId}/executions/${executionId}/details`, {
        token,
      }),

    cancelExecution: (workflowId: string, executionId: string, token: string) =>
      request<{ message: string }>(
        `/workflows/${workflowId}/executions/${executionId}/cancel`,
        {
          method: "POST",
          token,
        },
      ),

    retryExecution: (workflowId: string, executionId: string, token: string) =>
      request<{ executionId: string; message: string }>(
        `/workflows/${workflowId}/executions/${executionId}/retry`,
        {
          method: "POST",
          token,
        },
      ),

    getTemplates: (token: string) =>
      request<{ templates: WorkflowTemplateMetadata[] }>(
        "/workflows/templates",
        {
          token,
        },
      ),

    getTemplate: (templateId: string, token: string) =>
      request<{ template: WorkflowTemplate }>(
        `/workflows/templates/${templateId}`,
        {
          token,
        },
      ),

    createFromTemplate: (data: CreateFromTemplateDto, token: string) =>
      request<{ workflow: Workflow }>("/workflows/from-template", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
  },

  integrations: {
    list: (token: string) =>
      request<{ integrations: Integration[] }>("/integrations", { token }),

    get: (id: string, token: string) =>
      request<{ integration: Integration }>(`/integrations/${id}`, { token }),

    create: (data: CreateIntegrationDto, token: string) =>
      request<{ integration: Integration }>("/integrations", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateIntegrationDto, token: string) =>
      request<{ integration: Integration }>(`/integrations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/integrations/${id}`, {
        method: "DELETE",
        token,
      }),

    test: (id: string, token: string) =>
      request<{ success: boolean; message: string }>(
        `/integrations/${id}/test`,
        {
          method: "POST",
          token,
        },
      ),

    testBeforeConnect: (data: CreateIntegrationDto, token: string) =>
      request<{ success: boolean; message: string }>("/integrations/test", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    getWebhookUrl: (token: string) =>
      request<{
        webhookToken: string;
        urls: {
          jira: string;
          gitlab: string;
          github: string;
          trello: string;
        };
      }>("/integrations/webhook-url", { token }),

    regenerateWebhookUrl: (token: string) =>
      request<{
        webhookToken: string;
        urls: {
          jira: string;
          gitlab: string;
          github: string;
          trello: string;
        };
      }>("/integrations/webhook-url/regenerate", {
        method: "POST",
        token,
      }),
  },

  apiKeys: {
    list: (token: string) =>
      request<{ apiKeys: ApiKey[] }>("/api-keys", { token }),

    create: (data: CreateApiKeyDto, token: string) =>
      request<CreateApiKeyResponse>("/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/api-keys/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  aiCredentials: {
    list: (token: string) =>
      request<{ credentials: AICredential[] }>("/ai-credentials", { token }),

    get: (id: string, token: string) =>
      request<{ credential: AICredential }>(`/ai-credentials/${id}`, { token }),

    create: (data: CreateAICredentialDto, token: string) =>
      request<{ credential: AICredential }>("/ai-credentials", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateAICredentialDto, token: string) =>
      request<{ credential: AICredential }>(`/ai-credentials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/ai-credentials/${id}`, {
        method: "DELETE",
        token,
      }),

    test: (id: string, token: string) =>
      request<{ success: boolean; message: string }>(
        `/ai-credentials/${id}/test`,
        {
          method: "POST",
          token,
        },
      ),

    testBeforeConnect: (
      data: { provider: string; apiKey?: string },
      token: string,
    ) =>
      request<{ success: boolean; message: string }>("/ai-credentials/test", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
  },

  repositories: {
    list: (token: string, active?: boolean) => {
      const params = active !== undefined ? `?active=${active}` : "";
      return request<{ repositories: Repository[] }>(`/repositories${params}`, {
        token,
      });
    },

    available: (token: string) =>
      request<{ repositories: Repository[] }>("/repositories/available", {
        token,
      }),

    get: (id: string, token: string) =>
      request<{ repository: Repository }>(`/repositories/${id}`, { token }),

    update: (id: string, data: UpdateRepositoryDto, token: string) =>
      request<{ repository: Repository }>(`/repositories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    bulkUpdate: (data: BulkUpdateRepositoriesDto, token: string) =>
      request<{ updated: number }>("/repositories/bulk", {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    bulkDelete: (ids: string[], token: string) =>
      request<{ result: { deleted: number } }>("/repositories/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/repositories/${id}`, {
        method: "DELETE",
        token,
      }),

    listRemote: (token: string) =>
      request<{ repositories: RemoteRepository[] }>("/repositories/remote", {
        token,
      }),

    syncExisting: (token: string) =>
      request<{ result: SyncRepositoriesResult }>(
        "/repositories/sync/existing",
        {
          method: "POST",
          token,
        },
      ),

    syncOne: (id: string, token: string) =>
      request<{ synced: boolean; message: string }>(
        `/repositories/${id}/sync`,
        {
          method: "POST",
          token,
        },
      ),

    syncAll: (token: string) =>
      request<{ result: SyncAllRepositoriesResult }>("/repositories/sync", {
        method: "POST",
        token,
      }),

    syncSelective: (
      data: { integrationId: string; externalIds: string[] },
      token: string,
    ) =>
      request<{ result: SyncRepositoriesResult }>(
        "/repositories/sync/selective",
        {
          method: "POST",
          body: JSON.stringify(data),
          token,
        },
      ),

    syncIntegration: (integrationId: string, token: string) =>
      request<SyncRepositoriesResult>(`/repositories/sync/${integrationId}`, {
        method: "POST",
        token,
      }),
  },

  sessions: {
    list: (token: string, status?: string, projectId?: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (projectId) params.set("projectId", projectId);
      const qs = params.toString();
      return request<{ sessions: AgentSession[] }>(
        `/sessions${qs ? `?${qs}` : ""}`,
        { token },
      );
    },

    get: (id: string, token: string) =>
      request<{ session: AgentSession }>(`/sessions/${id}`, { token }),

    create: (data: CreateSessionDto, token: string) =>
      request<{ session: AgentSession }>("/sessions", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateSessionMetadataDto, token: string) =>
      request<{ session: AgentSession }>(`/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    recreate: (id: string, data: RecreateSessionDto, token: string) =>
      request<{ session: AgentSession }>(`/sessions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/sessions/${id}`, {
        method: "DELETE",
        token,
      }),

    startTerminal: (
      id: string,
      token: string,
      options?: { terminalId?: string; cmd?: string[] },
    ) =>
      request<{ terminalId: string; status: string; buffer?: string }>(
        `/sessions/${id}/terminals`,
        {
          method: "POST",
          body: options ? JSON.stringify(options) : undefined,
          token,
        },
      ),

    closeTerminal: (id: string, terminalId: string, token: string) =>
      request<{ status: string }>(
        `/sessions/${id}/terminals/${encodeURIComponent(terminalId)}`,
        {
          method: "DELETE",
          token,
        },
      ),

    pause: (id: string, token: string) =>
      request<{ status: string }>(`/sessions/${id}/pause`, {
        method: "POST",
        token,
      }),

    resume: (id: string, token: string) =>
      request<{ status: string }>(`/sessions/${id}/resume`, {
        method: "POST",
        token,
      }),

    stop: (id: string, token: string) =>
      request<{ status: string }>(`/sessions/${id}/stop`, {
        method: "POST",
        token,
      }),

    clone: (id: string, token: string) =>
      request<{ session: AgentSession }>(`/sessions/${id}/clone`, {
        method: "POST",
        token,
      }),

    getFiles: (id: string, token: string, path?: string) => {
      const qs = path ? `?path=${encodeURIComponent(path)}` : "";
      return request<{ files: string[] }>(`/sessions/${id}/files${qs}`, {
        token,
      });
    },

    getGitStatus: (id: string, token: string) =>
      request<{ statuses: Array<{ path: string; status: string }> }>(
        `/sessions/${id}/git-status`,
        { token },
      ),

    readFile: (id: string, filePath: string, token: string) =>
      request<{ path: string; content: string }>(
        `/sessions/${id}/file?path=${encodeURIComponent(filePath)}`,
        { token },
      ),

    writeFile: (id: string, path: string, content: string, token: string) =>
      request<{ status: string }>(`/sessions/${id}/file`, {
        method: "POST",
        body: JSON.stringify({ path, content }),
        token,
      }),

    deleteFile: (id: string, path: string, token: string) =>
      request<{ status: string }>(
        `/sessions/${id}/file?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
          token,
        },
      ),
  },

  snapshots: {
    list: (token: string) =>
      request<{ snapshots: Snapshot[] }>("/snapshots", { token }),

    get: (id: string, token: string) =>
      request<{ snapshot: Snapshot }>(`/snapshots/${id}`, { token }),

    create: (data: CreateSnapshotDto, token: string) =>
      request<{ snapshot: Snapshot }>("/snapshots", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateSnapshotDto, token: string) =>
      request<{ snapshot: Snapshot }>(`/snapshots/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/snapshots/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  chat: {
    listConversations: (token: string) =>
      request<{ conversations: ChatConversation[] }>("/chat/conversations", {
        token,
      }),

    getConversation: (id: string, token: string) =>
      request<{
        conversation: ChatConversation & { messages: ChatMessage[] };
      }>(`/chat/conversations/${id}`, { token }),

    createConversation: (data: CreateConversationDto, token: string) =>
      request<{ conversation: ChatConversation }>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    deleteConversation: (id: string, token: string) =>
      request<void>(`/chat/conversations/${id}`, {
        method: "DELETE",
        token,
      }),

    sendMessage: (id: string, data: SendMessageDto, token: string) =>
      request<SendMessageResponse>(`/chat/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
  },

  skills: {
    list: (token: string) =>
      request<{ skills: Skill[] }>("/skills", { token }),

    get: (id: string, token: string) =>
      request<{ skill: Skill }>(`/skills/${id}`, { token }),

    create: (data: CreateSkillDto, token: string) =>
      request<{ skill: Skill }>("/skills", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: UpdateSkillDto, token: string) =>
      request<{ skill: Skill }>(`/skills/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<void>(`/skills/${id}`, {
        method: "DELETE",
        token,
      }),

    importGitHub: (data: { repo: string; path?: string; branch?: string }, token: string) =>
      request<{ imported: number; skills: string[] }>("/skills/import-github", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
  },
};
