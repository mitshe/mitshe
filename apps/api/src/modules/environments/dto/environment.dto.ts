import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnvironmentVariableDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;
}

export class CreateEnvironmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Environment name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @IsInt()
  @Min(256)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Memory limit in MB' })
  memoryMb?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiPropertyOptional({ description: 'CPU cores' })
  cpuCores?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Setup script to run on container start' })
  setupScript?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentVariableDto)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Environment variables' })
  variables?: EnvironmentVariableDto[];
}

export class UpdateEnvironmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(256)
  @IsOptional()
  memoryMb?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  cpuCores?: number;

  @IsString()
  @IsOptional()
  setupScript?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentVariableDto)
  @IsOptional()
  variables?: EnvironmentVariableDto[];
}
