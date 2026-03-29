import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'Unique API key identifier' })
  id: string;

  @ApiProperty({ description: 'API key name' })
  name: string;

  @ApiProperty({ description: 'API key prefix (visible part)' })
  prefix: string;

  @ApiPropertyOptional({
    description: 'Last time the API key was used',
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({
    description: 'API key expiration timestamp',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({ description: 'Full API key (only shown once on creation)' })
  key: string; // Full key, only returned on creation
}

// Wrapper response DTOs for API responses
export class ApiKeyWrapperResponseDto {
  @ApiProperty({ type: ApiKeyResponseDto })
  apiKey: ApiKeyResponseDto;

  @ApiProperty({ description: 'Full API key (only shown on creation)' })
  key: string;
}

export class ApiKeyListResponseDto {
  @ApiProperty({ type: [ApiKeyResponseDto], description: 'List of API keys' })
  apiKeys: ApiKeyResponseDto[];
}
