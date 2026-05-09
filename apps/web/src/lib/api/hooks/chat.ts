"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type {
  CreateConversationDto,
  SendMessageDto,
} from "../types";
import { queryKeys, useAuthToken } from "./shared";

export function useChatConversations() {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: async () => {
      const token = await getToken();
      const { conversations } = await api.chat.listConversations(token);
      return conversations;
    },
  });
}

export function useChatConversation(id: string) {
  const getToken = useAuthToken();
  return useQuery({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: async () => {
      const token = await getToken();
      const { conversation } = await api.chat.getConversation(id, token);
      return conversation;
    },
    enabled: !!id,
  });
}

export function useCreateChatConversation() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationDto) => {
      const token = await getToken();
      const { conversation } = await api.chat.createConversation(data, token);
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useDeleteChatConversation() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await api.chat.deleteConversation(id, token);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useSendChatMessage() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: SendMessageDto;
    }) => {
      const token = await getToken();
      return api.chat.sendMessage(conversationId, data, token);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });
}
