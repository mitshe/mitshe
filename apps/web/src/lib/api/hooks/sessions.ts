"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateSessionDto,
  UpdateSessionMetadataDto,
  RecreateSessionDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

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

export function usePushAndCreatePR() {
  const getToken = useAuthToken();
  return useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: { title?: string; description?: string; targetBranch?: string };
    }) => {
      const token = await getToken();
      return api.sessions.pushAndCreatePR(sessionId, data, token);
    },
  });
}

export function useSessionBrowserInfo(sessionId: string, enabled: boolean) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: ["session-browser", sessionId],
    queryFn: async () => {
      const token = await getToken();
      return api.sessions.getBrowserInfo(sessionId, token);
    },
    enabled,
    retry: 10,
    retryDelay: (attempt) => Math.min(2000 * Math.pow(1.5, attempt), 15000),
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
