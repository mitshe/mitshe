// Agent Definition types

export interface AgentDefinition {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  aiCredentialId: string | null;
  startArguments: string | null;
  instructions: string;
  maxSessionDurationMs: number | null;
  defaultProjectId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  aiCredential?: {
    id: string;
    provider: string;
  };
  defaultProject?: {
    id: string;
    name: string;
    key: string;
  };
  defaultRepositories?: Array<{
    repositoryId: string;
    repository?: {
      id: string;
      name: string;
      fullPath: string;
    };
  }>;
}

export interface CreateAgentDefinitionDto {
  name: string;
  description?: string;
  aiCredentialId?: string;
  startArguments?: string;
  instructions?: string;
  maxSessionDurationMs?: number;
  defaultProjectId?: string;
  defaultRepositoryIds?: string[];
}

export interface UpdateAgentDefinitionDto {
  name?: string;
  description?: string;
  aiCredentialId?: string;
  startArguments?: string;
  instructions?: string;
  maxSessionDurationMs?: number;
  defaultProjectId?: string;
  defaultRepositoryIds?: string[];
}
