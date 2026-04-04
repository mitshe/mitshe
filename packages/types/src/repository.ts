// Repository types

import type { IntegrationType } from "./integration";

export type GitProvider = "GITLAB" | "GITHUB" | "BITBUCKET";

export interface Repository {
  id: string;
  organizationId: string;
  integrationId: string;
  provider: GitProvider;
  externalId: string;
  name: string;
  fullPath: string;
  description: string | null;
  defaultBranch: string;
  cloneUrl: string;
  webUrl: string;
  branchPattern: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  integration?: {
    id: string;
    type: IntegrationType;
    status: string;
  };
  projects?: {
    id: string;
    name: string;
    key: string;
  }[];
  _count?: {
    projects: number;
  };
}

export interface UpdateRepositoryDto {
  isActive?: boolean;
  branchPattern?: string;
  defaultBranch?: string;
}

export interface BulkUpdateRepositoriesDto {
  ids: string[];
  isActive: boolean;
}

export interface RemoteRepository {
  externalId: string;
  name: string;
  fullPath: string;
  description: string | null;
  defaultBranch: string;
  webUrl: string;
  provider: GitProvider;
  integrationId: string;
  alreadyImported: boolean;
}

export interface SyncRepositoriesResult {
  synced: number;
  total: number;
}

export interface SyncAllRepositoriesResult {
  integrations: number;
  totalSynced: number;
  totalRepositories: number;
  errors: string[];
}
