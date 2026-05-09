"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateTaskDto,
  UpdateTaskDto,
  ImportPreviewDto,
  ImportConfirmDto,
  RunWorkflowDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

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

export function useRefreshAllTasks() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.tasks.refreshAll(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useImportAssigned() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { source: 'JIRA' | 'YOUTRACK'; projectId?: string }) => {
      const token = await getToken();
      return api.tasks.importAssigned(data, token);
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
