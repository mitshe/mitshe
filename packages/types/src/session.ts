// Agent Session types

export type SessionStatus =
  | "CREATING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

export interface AgentSession {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  instructions: string;
  status: SessionStatus;
  aiCredentialId: string | null;
  containerId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  repositories?: SessionRepositoryInfo[];
  project?: {
    id: string;
    name: string;
    key: string;
  };
  aiCredential?: {
    id: string;
    provider: string;
  };
}

export interface SessionRepositoryInfo {
  sessionId: string;
  repositoryId: string;
  repository?: {
    id: string;
    name: string;
    fullPath: string;
    provider: string;
    cloneUrl: string;
    webUrl: string;
  };
}

export interface CreateSessionDto {
  name: string;
  projectId?: string;
  repositoryIds: string[];
  aiCredentialId?: string;
  instructions?: string;
}

export interface SessionFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: SessionFileNode[];
}
