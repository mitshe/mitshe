import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  key: string; // Short identifier like "PROJ", "API"

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  repoUrl?: string;

  @IsString()
  @IsOptional()
  repoBranch?: string;

  @IsEnum(['gitlab', 'github'])
  @IsOptional()
  gitProviderType?: 'gitlab' | 'github';

  @IsString()
  @IsOptional()
  gitProviderId?: string;

  @IsEnum(['jira', 'youtrack', 'linear'])
  @IsOptional()
  issueTrackerType?: 'jira' | 'youtrack' | 'linear';

  @IsString()
  @IsOptional()
  issueTrackerProject?: string;

  @IsObject()
  @IsOptional()
  issueTrackerConfig?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  aiTriggerLabel?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  repoUrl?: string;

  @IsString()
  @IsOptional()
  repoBranch?: string;

  @IsEnum(['gitlab', 'github'])
  @IsOptional()
  gitProviderType?: 'gitlab' | 'github';

  @IsString()
  @IsOptional()
  gitProviderId?: string;

  @IsEnum(['jira', 'youtrack', 'linear'])
  @IsOptional()
  issueTrackerType?: 'jira' | 'youtrack' | 'linear';

  @IsString()
  @IsOptional()
  issueTrackerProject?: string;

  @IsObject()
  @IsOptional()
  issueTrackerConfig?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  aiTriggerLabel?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'Unique project identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Project name' })
  name: string;

  @ApiProperty({ description: 'Short project key (e.g., PROJ, API)' })
  key: string;

  @ApiPropertyOptional({ description: 'Project description', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ description: 'Repository URL', nullable: true })
  repoUrl: string | null;

  @ApiProperty({ description: 'Repository branch' })
  repoBranch: string;

  @ApiPropertyOptional({
    description: 'Git provider type',
    nullable: true,
    enum: ['gitlab', 'github'],
  })
  gitProviderType: string | null;

  @ApiPropertyOptional({ description: 'Git provider ID', nullable: true })
  gitProviderId: string | null;

  @ApiPropertyOptional({
    description: 'Issue tracker type',
    nullable: true,
    enum: ['jira', 'youtrack', 'linear'],
  })
  issueTrackerType: string | null;

  @ApiPropertyOptional({
    description: 'Issue tracker project key',
    nullable: true,
  })
  issueTrackerProject: string | null;

  @ApiPropertyOptional({
    description: 'Issue tracker configuration',
    nullable: true,
  })
  issueTrackerConfig: Record<string, unknown> | null;

  @ApiProperty({ description: 'AI trigger label' })
  aiTriggerLabel: string;

  @ApiProperty({ description: 'Whether the project is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

// Wrapper response DTOs
export class ProjectWrapperResponseDto {
  @ApiProperty({ type: ProjectResponseDto })
  project: ProjectResponseDto;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto], description: 'List of projects' })
  data: ProjectResponseDto[];

  @ApiProperty({ description: 'Total number of projects' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}
