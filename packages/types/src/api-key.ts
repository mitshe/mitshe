// API Key types

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  organizationId: string;
  createdById: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyDto {
  name: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  key: string;
}
