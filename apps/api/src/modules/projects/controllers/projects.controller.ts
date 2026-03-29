import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from '../services/projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectWrapperResponseDto,
} from '../dto/project.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Projects')
@ApiBearerAuth('bearer')
@Controller('api/v1/projects')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(organizationId, dto);
    return { project };
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the organization' })
  @ApiResponse({ status: 200, description: 'Returns list of projects' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@OrganizationId() organizationId: string) {
    const projects = await this.projectsService.findAll(organizationId);
    return { projects };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the project',
    type: ProjectWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const project = await this.projectsService.findOne(organizationId, id);
    return { project };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(organizationId, id, dto);
    return { project };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.projectsService.remove(organizationId, id);
  }
}
