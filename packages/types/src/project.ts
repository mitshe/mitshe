// Project types

export interface Project {
  id: string;
  name: string;
  description: string | null;
  key: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    workflows: number;
  };
}

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  key?: string;
  description?: string;
}
