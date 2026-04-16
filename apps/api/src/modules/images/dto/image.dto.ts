import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Image name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Source session ID to snapshot' })
  sessionId: string;
}

export class UpdateImageDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Image name' })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;
}
