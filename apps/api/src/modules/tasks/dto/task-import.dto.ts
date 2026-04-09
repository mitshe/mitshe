import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportPreviewDto {
  @IsUrl()
  @ApiProperty({ description: 'URL of the external issue to preview' })
  url: string;
}

export class ImportConfirmDto {
  @IsUrl()
  @ApiProperty({ description: 'URL of the external issue to import' })
  url: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Project ID to import the task into' })
  projectId?: string;
}

export class RunWorkflowDto {
  @IsString()
  @ApiProperty({ description: 'ID of the workflow to run' })
  workflowId: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Additional data to pass to the workflow',
  })
  additionalData?: Record<string, unknown>;
}

// Response DTOs for import endpoints
export class JiraProjectDto {
  @ApiProperty({ description: 'Jira project key' })
  key: string;

  @ApiProperty({ description: 'Jira project name' })
  name: string;
}

export class JiraComponentDto {
  @ApiProperty({ description: 'Component ID' })
  id: string;

  @ApiProperty({ description: 'Component name' })
  name: string;
}

export class JiraImportPreviewDto {
  @ApiProperty({ description: 'Source system', example: 'JIRA' })
  source: 'JIRA';

  @ApiProperty({ description: 'Issue key', example: 'PROJ-123' })
  issueKey: string;

  @ApiProperty({ description: 'Issue title' })
  title: string;

  @ApiPropertyOptional({ description: 'Issue description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Issue status' })
  status: string;

  @ApiPropertyOptional({ description: 'Issue priority', nullable: true })
  priority: string | null;

  @ApiProperty({ description: 'Issue type' })
  issueType: string;

  @ApiPropertyOptional({ description: 'Assignee name', nullable: true })
  assignee: string | null;

  @ApiPropertyOptional({ description: 'Reporter name', nullable: true })
  reporter: string | null;

  @ApiProperty({ description: 'Issue labels', type: [String] })
  labels: string[];

  @ApiProperty({ description: 'Issue components', type: [JiraComponentDto] })
  components: JiraComponentDto[];

  @ApiProperty({ description: 'Jira project info', type: JiraProjectDto })
  project: JiraProjectDto;

  @ApiProperty({ description: 'Issue URL' })
  url: string;

  @ApiProperty({ description: 'Creation date' })
  created: string;

  @ApiProperty({ description: 'Last update date' })
  updated: string;
}

export class ImportPreviewResponseDto {
  @ApiProperty({
    description: 'Preview of the issue to import',
    type: JiraImportPreviewDto,
  })
  preview: JiraImportPreviewDto;
}

// Keep the interface for internal use
export interface JiraImportPreview {
  source: 'JIRA';
  issueKey: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  issueType: string;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  components: { id: string; name: string }[];
  project: {
    key: string;
    name: string;
  };
  url: string;
  created: string;
  updated: string;
}

export interface TrelloImportPreview {
  source: 'TRELLO';
  cardId: string;
  title: string;
  description: string | null;
  status: string;
  assignee: string | null;
  labels: string[];
  board: {
    id: string;
    name: string;
  };
  url: string;
  updated: string;
}
