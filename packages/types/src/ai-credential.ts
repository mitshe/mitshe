// AI Credential types

export type AIProvider =
  | "CLAUDE"
  | "OPENAI"
  | "OPENROUTER"
  | "GEMINI"
  | "GROQ"
  | "CLAUDE_CODE_LOCAL"
  | "OPENCLAW";

export interface AICredential {
  id: string;
  organizationId: string;
  provider: AIProvider;
  isDefault: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  maskedKey?: string;
}

export interface CreateAICredentialDto {
  provider: AIProvider;
  apiKey: string;
  isDefault?: boolean;
}

export interface UpdateAICredentialDto {
  apiKey?: string;
  isDefault?: boolean;
}
