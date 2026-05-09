"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateFromTemplateDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

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
