import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Session name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Project ID' })
  projectId?: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ description: 'Repository IDs to attach' })
  repositoryIds: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'AI credential ID' })
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Agent definition ID (preset)' })
  agentDefinitionId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Start arguments for the agent CLI' })
  startArguments?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Integration IDs to attach' })
  integrationIds?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Environment ID' })
  environmentId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'System instructions' })
  instructions?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Enable Docker socket in container' })
  enableDocker?: boolean;
}

export class UpdateSessionMetadataDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Session name' })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Project ID (pass empty string to detach)',
  })
  projectId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'System instructions' })
  instructions?: string;
}

export class RecreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Session name' })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Project ID' })
  projectId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Repository IDs to attach' })
  repositoryIds?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'AI credential ID' })
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Agent definition ID (preset)' })
  agentDefinitionId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Start arguments for the agent CLI' })
  startArguments?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Integration IDs to attach' })
  integrationIds?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Environment ID' })
  environmentId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'System instructions' })
  instructions?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Enable Docker socket in container' })
  enableDocker?: boolean;
}

export class SessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiPropertyOptional() projectId: string | null;
  @ApiProperty() name: string;
  @ApiProperty() instructions: string;
  @ApiProperty({ enum: SessionStatus }) status: SessionStatus;
  @ApiPropertyOptional() aiCredentialId: string | null;
  @ApiPropertyOptional() containerId: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() lastActiveAt: Date;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  sessions: SessionResponseDto[];
}

export class SessionDetailResponseDto {
  @ApiProperty({ type: SessionResponseDto })
  session: SessionResponseDto;
}

export class ExecCommandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @ApiProperty({ description: 'Shell command to execute' })
  command: string;

  @IsInt()
  @Min(1000)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Timeout in milliseconds (default: 60000)',
  })
  timeout?: number;
}

export class WriteFileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'File path (must be within /workspace)' })
  path: string;

  @IsString()
  @ApiProperty({ description: 'File content' })
  content: string;
}

export class TerminalInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @ApiProperty({ description: 'Raw terminal input' })
  input: string;
}

export class StartTerminalDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Terminal ID' })
  terminalId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Command to run (default: bash)' })
  cmd?: string[];
}
