export interface ChatConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string | null;
  aiCredentialId: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  toolUse: ChatToolCall[] | null;
  toolResults: any | null;
  createdAt: string;
}

export interface ChatToolCall {
  name: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface CreateConversationDto {
  title?: string;
  aiCredentialId?: string;
  model?: string;
}

export interface SendMessageDto {
  content: string;
  aiCredentialId?: string;
  model?: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolCalls: ChatToolCall[];
}
