import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../shared/auth';
import {
  OrganizationId,
  UserId,
} from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';
import { SkillsService } from '../services/skills.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  ImportGitHubSkillsDto,
} from '../dto/skill.dto';

@ApiTags('Skills')
@ApiBearerAuth('bearer')
@Controller('api/v1/skills')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateSkillDto,
  ) {
    const skill = await this.skillsService.create(organizationId, userId, dto);
    return { skill };
  }

  @Post('import-github')
  async importFromGitHub(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: ImportGitHubSkillsDto,
  ) {
    return this.skillsService.importFromGitHub(
      organizationId,
      userId,
      dto.repo,
      dto.path,
      dto.branch,
    );
  }

  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    const skills = await this.skillsService.findAll(organizationId);
    return { skills };
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const skill = await this.skillsService.findOne(organizationId, id);
    return { skill };
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    const skill = await this.skillsService.update(organizationId, id, dto);
    return { skill };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.skillsService.remove(organizationId, id);
  }
}
