import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { IntegrationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsObject()
  config: Record<string, unknown>;
}

export class UpdateIntegrationDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

export class IntegrationResponseDto {
  @ApiProperty({ description: 'Unique integration identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Integration type', enum: IntegrationType })
  type: IntegrationType;

  @ApiProperty({ description: 'Integration status' })
  status: string;

  @ApiPropertyOptional({ description: 'Last sync timestamp', nullable: true })
  lastSyncAt: Date | null;

  @ApiPropertyOptional({
    description: 'Error message if integration failed',
    nullable: true,
  })
  errorMessage: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
  // Note: config is NOT included for security
}

// Type-specific config interfaces
export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
}

export interface GitLabConfig {
  baseUrl: string;
  accessToken: string;
  projectId?: string;
}

export interface GitHubConfig {
  accessToken: string;
  owner: string;
  repo?: string;
}

export interface SlackConfig {
  botToken: string;
  defaultChannel?: string;
  webhookUrl?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

export interface LinearConfig {
  apiKey: string;
}

// Wrapper response DTOs for API responses
export class IntegrationWrapperResponseDto {
  @ApiProperty({ type: IntegrationResponseDto })
  integration: IntegrationResponseDto;
}

export class IntegrationListResponseDto {
  @ApiProperty({
    type: [IntegrationResponseDto],
    description: 'List of integrations',
  })
  integrations: IntegrationResponseDto[];
}

export class WebhookUrlResponseDto {
  @ApiProperty({ description: 'Webhook token for authentication' })
  webhookToken: string;

  @ApiProperty({ description: 'Webhook URLs for different integration types' })
  urls: {
    jira: string;
    gitlab: string;
    github: string;
  };
}

export class TestConnectionResponseDto {
  @ApiProperty({ description: 'Whether the connection test was successful' })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Connection test message',
    nullable: true,
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Error details if test failed',
    nullable: true,
  })
  error?: string;
}
