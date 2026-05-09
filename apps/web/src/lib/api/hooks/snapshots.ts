"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { CreateSnapshotDto } from "../types";
import { queryKeys, useAuthToken } from "./shared";

export function useSnapshots() {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.snapshots.list(),
    queryFn: async () => {
      const token = await getToken();
      const { snapshots } = await api.snapshots.list(token);
      return snapshots;
    },
  });
}

export function useSnapshot(id: string) {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.snapshots.detail(id),
    queryFn: async () => {
      const token = await getToken();
      const { snapshot } = await api.snapshots.get(id, token);
      return snapshot;
    },
    enabled: !!id,
  });
}

export function useCreateSnapshot() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSnapshotDto) => {
      const token = await getToken();
      const { snapshot } = await api.snapshots.create(data, token);
      return snapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
    },
  });
}

export function useUpdateSnapshot() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const token = await getToken();
      const { snapshot } = await api.snapshots.update(id, data, token);
      return snapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
    },
  });
}

export function useDeleteSnapshot() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.snapshots.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
    },
  });
}

/** @deprecated Use useSnapshots */
export const useImages = useSnapshots;
/** @deprecated Use useCreateSnapshot */
export const useCreateImage = useCreateSnapshot;
/** @deprecated Use useDeleteSnapshot */
export const useDeleteImage = useDeleteSnapshot;
