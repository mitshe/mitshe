"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { CreateApiKeyDto } from "../types";
import { queryKeys, useAuthToken } from "./shared";

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
