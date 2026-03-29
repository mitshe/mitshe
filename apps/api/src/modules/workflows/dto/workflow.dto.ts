import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Workflow Definition Types
export class WorkflowNodeDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  name: string;

  @IsObject()
  position: { x: number; y: number };

  @IsObject()
  config: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  next?: string[];

  @IsString()
  @IsOptional()
  onError?: string;
}

export class WorkflowEdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsString()
  @IsOptional()
  condition?: string;
}

export class WorkflowDefinitionDto {
  @IsString()
  version: '1.0';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[];

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

// DTOs
export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  triggerType?: string; // 'manual' | 'schedule' | 'webhook' | 'event'

  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, unknown>;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowDefinitionDto)
  @IsOptional()
  definition?: WorkflowDefinitionDto;
}

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowDefinitionDto)
  @IsOptional()
  definition?: WorkflowDefinitionDto;
}

export class WorkflowResponseDto {
  @ApiProperty({ description: 'Unique workflow identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Workflow name' })
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Workflow definition (nodes, edges, variables)',
    type: WorkflowDefinitionDto,
  })
  definition: WorkflowDefinitionDto;

  @ApiProperty({ description: 'Whether the workflow is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Workflow version number' })
  version: number;

  @ApiProperty({ description: 'User ID who created the workflow' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CreateFromTemplateDto {
  @IsString()
  templateId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

export class WorkflowFilterDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ExecutionFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

// Wrapper response DTOs for API responses
export class WorkflowWrapperResponseDto {
  @ApiProperty({ type: WorkflowResponseDto })
  workflow: WorkflowResponseDto;
}

export class WorkflowWithMessageResponseDto {
  @ApiProperty({ type: WorkflowResponseDto })
  workflow: WorkflowResponseDto;

  @ApiProperty({ description: 'Response message' })
  message: string;
}

export class WorkflowListResponseDto {
  @ApiProperty({
    type: [WorkflowResponseDto],
    description: 'List of workflows',
  })
  data: WorkflowResponseDto[];

  @ApiProperty({ description: 'Total number of workflows' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class TemplateWrapperResponseDto {
  @ApiProperty({ description: 'Workflow template' })
  template: Record<string, unknown>;
}

export class TemplateListResponseDto {
  @ApiProperty({ description: 'List of workflow templates', type: 'array' })
  templates: Record<string, unknown>[];
}

export class ExecutionWrapperResponseDto {
  @ApiProperty({ description: 'Workflow execution details' })
  execution: Record<string, unknown>;
}

export class ExecutionListResponseDto {
  @ApiProperty({ description: 'List of workflow executions', type: 'array' })
  data: Record<string, unknown>[];

  @ApiProperty({ description: 'Total number of executions' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class ExecutionStartResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  executionId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;
}

export class ExecutionRetryResponseDto {
  @ApiProperty({ description: 'New execution ID' })
  executionId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;
}

export class ExecutionCancelResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;
}
