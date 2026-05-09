"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateSkillDto,
  UpdateSkillDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

export function useSkills() {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.skills.list(),
    queryFn: async () => {
      const token = await getToken();
      const { skills } = await api.skills.list(token);
      return skills;
    },
  });
}

export function useCreateSkill() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSkillDto) => {
      const token = await getToken();
      const { skill } = await api.skills.create(data, token);
      return skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
  });
}

export function useUpdateSkill() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSkillDto }) => {
      const token = await getToken();
      const { skill } = await api.skills.update(id, data, token);
      return skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
  });
}

export function useDeleteSkill() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.skills.delete(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
  });
}

export function useImportGitHubSkills() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { repo: string; path?: string; branch?: string }) => {
      const token = await getToken();
      return api.skills.importGitHub(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
  });
}
