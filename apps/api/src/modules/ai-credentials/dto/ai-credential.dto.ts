import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { AIProvider } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAICredentialDto {
  @IsEnum(AIProvider)
  provider: AIProvider;

  @IsString()
  apiKey: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAICredentialDto {
  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class AICredentialResponseDto {
  @ApiProperty({ description: 'Unique credential identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'AI provider', enum: AIProvider })
  provider: AIProvider;

  @ApiProperty({
    description: 'Whether this is the default credential for the provider',
  })
  isDefault: boolean;

  @ApiPropertyOptional({
    description: 'Last time the credential was used',
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ApiProperty({ description: 'Number of times the credential has been used' })
  usageCount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Masked API key (e.g., sk-...xxxx)' })
  maskedKey?: string;
  // Note: Full API key is NOT included for security
}

// Wrapper response DTOs for API responses
export class AICredentialWrapperResponseDto {
  @ApiProperty({ type: AICredentialResponseDto })
  credential: AICredentialResponseDto;
}

export class AICredentialListResponseDto {
  @ApiProperty({
    type: [AICredentialResponseDto],
    description: 'List of AI credentials',
  })
  credentials: AICredentialResponseDto[];
}

export class TestAICredentialDto {
  @IsEnum(AIProvider)
  @ApiProperty({ description: 'AI provider to test', enum: AIProvider })
  provider: AIProvider;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'API key (optional for local providers)' })
  apiKey?: string;
}

export class TestAIConnectionResponseDto {
  @ApiProperty({ description: 'Whether the connection test was successful' })
  success: boolean;

  @ApiProperty({ description: 'Connection test result message' })
  message: string;
}
