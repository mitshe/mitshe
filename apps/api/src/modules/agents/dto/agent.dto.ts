import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Agent name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Agent description' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'AI credential ID' })
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Start arguments for the agent CLI' })
  startArguments?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'System instructions' })
  instructions?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Max session duration in milliseconds' })
  maxSessionDurationMs?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Default project ID' })
  defaultProjectId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Default repository IDs' })
  defaultRepositoryIds?: string[];
}

export class UpdateAgentDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  startArguments?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxSessionDurationMs?: number;

  @IsString()
  @IsOptional()
  defaultProjectId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultRepositoryIds?: string[];
}
