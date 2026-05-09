"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

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
