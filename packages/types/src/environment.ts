// Environment types

export interface Environment {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  memoryMb: number | null;
  cpuCores: number | null;
  setupScript: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  variables?: EnvironmentVariable[];
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
  variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
}

export interface UpdateEnvironmentDto {
  name?: string;
  description?: string;
  memoryMb?: number;
  cpuCores?: number;
  setupScript?: string;
  variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
}
