import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Skill name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Category (testing, devops, backend, frontend)',
  })
  category?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Instructions (markdown) appended to CLAUDE.md' })
  instructions: string;
}

export class UpdateSkillDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  category?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  instructions?: string;
}
