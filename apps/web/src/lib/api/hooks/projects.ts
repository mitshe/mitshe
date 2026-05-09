"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { CreateProjectDto, UpdateProjectDto } from "../types";
import { queryKeys, useAuthToken } from "./shared";

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
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectDto }) => {
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
