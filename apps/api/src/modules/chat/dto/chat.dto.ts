import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Conversation title' })
  title?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'AI credential ID to use' })
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Model override (e.g. claude-sonnet-4-20250514)',
  })
  model?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User message content' })
  content: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'AI credential ID override for this message',
  })
  aiCredentialId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Model override' })
  model?: string;
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Title' })
  title?: string;
}
