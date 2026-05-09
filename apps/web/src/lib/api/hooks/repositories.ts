"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  UpdateRepositoryDto,
  BulkUpdateRepositoriesDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

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

export function useRepoBranches(repoId: string | undefined) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: ["repo-branches", repoId],
    queryFn: async () => {
      if (!repoId) return [];
      const token = await getToken();
      const { branches } = await api.repositories.listBranches(repoId, token);
      return branches;
    },
    enabled: !!repoId,
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
