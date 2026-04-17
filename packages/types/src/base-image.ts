export type SnapshotStatus = 'CREATING' | 'READY' | 'FAILED';

export interface Snapshot {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  dockerImage: string;
  status: SnapshotStatus;
  sizeBytes: string | null;
  sourceSessionId: string | null;
  parentImageId: string | null;
  enableDocker: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use Snapshot instead */
export type BaseImage = Snapshot;

export interface CreateSnapshotDto {
  name: string;
  description?: string;
  sessionId: string;
}

/** @deprecated Use CreateSnapshotDto instead */
export type CreateBaseImageDto = CreateSnapshotDto;

export interface UpdateSnapshotDto {
  name?: string;
  description?: string;
}

/** @deprecated Use UpdateSnapshotDto instead */
export type UpdateBaseImageDto = UpdateSnapshotDto;
