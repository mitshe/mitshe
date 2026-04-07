// Environment types

export interface EnvironmentIntegrationInfo {
  environmentId: string;
  integrationId: string;
  integration?: {
    id: string;
    type: string;
    status: string;
  };
}

export interface Environment {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  memoryMb: number | null;
  cpuCores: number | null;
  setupScript: string | null;
  enableDocker: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  variables?: EnvironmentVariable[];
  integrations?: EnvironmentIntegrationInfo[];
}

export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface CreateEnvironmentDto {
  name: string;
  description?: string;
  memoryMb?: number;
  cpuCores?: number;
  setupScript?: string;
  enableDocker?: boolean;
  variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
  integrationIds?: string[];
}

export interface UpdateEnvironmentDto {
  name?: string;
  description?: string;
  memoryMb?: number;
  cpuCores?: number;
  setupScript?: string;
  enableDocker?: boolean;
  variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
  integrationIds?: string[];
}
