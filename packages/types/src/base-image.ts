export interface BaseImage {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  dockerImage: string;
  sizeBytes: string | null; // BigInt serialized as string
  sourceSessionId: string | null;
  parentImageId: string | null;
  enableDocker: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBaseImageDto {
  name: string;
  description?: string;
  sessionId: string;
}

export interface UpdateBaseImageDto {
  name?: string;
  description?: string;
}
