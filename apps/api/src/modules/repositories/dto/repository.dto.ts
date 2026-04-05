import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';
import { GitProvider } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncRepositoriesDto {
  @IsEnum(GitProvider)
  provider: GitProvider;

  @IsString()
  integrationId: string;
}

export class UpdateRepositoryDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  branchPattern?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;
}

export class BulkUpdateRepositoriesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsBoolean()
  isActive: boolean;
}

export class RepositoryResponseDto {
  @ApiProperty({ description: 'Unique repository identifier' })
  id: string;

  @ApiProperty({ description: 'Git provider', enum: GitProvider })
  provider: GitProvider;

  @ApiProperty({ description: 'External repository ID from the provider' })
  externalId: string;

  @ApiProperty({ description: 'Repository name' })
  name: string;

  @ApiProperty({ description: 'Full repository path (e.g., owner/repo)' })
  fullPath: string;

  @ApiPropertyOptional({
    description: 'Repository description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Default branch name' })
  defaultBranch: string;

  @ApiProperty({ description: 'Git clone URL' })
  cloneUrl: string;

  @ApiProperty({ description: 'Web URL to view repository' })
  webUrl: string;

  @ApiPropertyOptional({
    description: 'Branch pattern for filtering',
    nullable: true,
  })
  branchPattern: string | null;

  @ApiProperty({ description: 'Whether the repository is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Associated integration details' })
  integration?: {
    id: string;
    type: string;
    status: string;
  };

  @ApiPropertyOptional({ description: 'Count of related entities' })
  _count?: {
    projects: number;
  };
}

// Wrapper response DTOs for API responses
export class RepositoryWrapperResponseDto {
  @ApiProperty({ type: RepositoryResponseDto })
  repository: RepositoryResponseDto;
}

export class RepositoryListResponseDto {
  @ApiProperty({
    type: [RepositoryResponseDto],
    description: 'List of repositories',
  })
  repositories: RepositoryResponseDto[];
}

export class SyncResultResponseDto {
  @ApiProperty({ description: 'Sync result data' })
  result: {
    synced: number;
    added: number;
    updated: number;
    errors?: string[];
  };
}

export class SelectiveSyncRepositoriesDto {
  @IsArray()
  @IsString({ each: true })
  externalIds: string[];

  @IsString()
  integrationId: string;
}

export class RemoteRepositoryResponseDto {
  @ApiProperty({ description: 'External repository ID from the provider' })
  externalId: string;

  @ApiProperty({ description: 'Repository name' })
  name: string;

  @ApiProperty({ description: 'Full repository path' })
  fullPath: string;

  @ApiPropertyOptional({
    description: 'Repository description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Default branch name' })
  defaultBranch: string;

  @ApiProperty({ description: 'Web URL to view repository' })
  webUrl: string;

  @ApiProperty({ description: 'Git provider' })
  provider: string;

  @ApiProperty({ description: 'Integration ID' })
  integrationId: string;

  @ApiProperty({ description: 'Whether the repo is already imported' })
  alreadyImported: boolean;
}

export class BulkDeleteRepositoriesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkDeleteResultResponseDto {
  @ApiProperty({ description: 'Bulk delete result' })
  result: {
    deleted: number;
  };
}

export class BulkUpdateResultResponseDto {
  @ApiProperty({ description: 'Bulk update result' })
  result: {
    updated: number;
    ids: string[];
  };
}
