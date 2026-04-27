import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';
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

export class ImportGitHubSkillsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, {
    message: 'Must be owner/repo format (e.g. mitshe/skills)',
  })
  @ApiProperty({
    description: 'GitHub repository in owner/repo format',
    example: 'forrestchang/andrej-karpathy-skills',
  })
  repo: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Subdirectory path within the repo (e.g. skills/testing)',
  })
  path?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Branch to fetch from (defaults to main)',
    default: 'main',
  })
  branch?: string;
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
