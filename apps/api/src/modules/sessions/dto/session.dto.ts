import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
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
  @ApiPropertyOptional({ description: 'System instructions (like CLAUDE.md)' })
  instructions?: string;
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
