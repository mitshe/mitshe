import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RepositoriesService } from '../services/repositories.service';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import {
  UpdateRepositoryDto,
  BulkUpdateRepositoriesDto,
  BulkDeleteRepositoriesDto,
  SelectiveSyncRepositoriesDto,
  RemoteRepositoryResponseDto,
  RepositoryWrapperResponseDto,
  RepositoryListResponseDto,
  SyncResultResponseDto,
  BulkUpdateResultResponseDto,
  BulkDeleteResultResponseDto,
} from '../dto/repository.dto';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Repositories')
@ApiBearerAuth('bearer')
@Controller('api/v1/repositories')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all repositories' })
  @ApiResponse({
    status: 200,
    description: 'List of repositories',
    type: RepositoryListResponseDto,
  })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('active') active?: string,
  ) {
    const isActive =
      active === 'true' ? true : active === 'false' ? false : undefined;
    const repositories = await this.repositoriesService.findAll(
      organizationId,
      { isActive },
    );
    return { repositories };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available repositories for project selection' })
  @ApiResponse({
    status: 200,
    description: 'Available repositories',
    type: RepositoryListResponseDto,
  })
  async getAvailable(@OrganizationId() organizationId: string) {
    const repositories =
      await this.repositoriesService.getAvailableForProject(organizationId);
    return { repositories };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync all repositories from all git integrations' })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    type: SyncResultResponseDto,
  })
  async syncAll(@OrganizationId() organizationId: string) {
    const result = await this.repositoriesService.syncAll(organizationId);
    return { result };
  }

  @Post('sync/existing')
  @ApiOperation({
    summary: 'Sync only already-imported repositories (update metadata)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    type: SyncResultResponseDto,
  })
  async syncExisting(@OrganizationId() organizationId: string) {
    const result =
      await this.repositoriesService.syncExisting(organizationId);
    return { result };
  }

  @Post('sync/selective')
  @ApiOperation({ summary: 'Selectively sync chosen repositories' })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    type: SyncResultResponseDto,
  })
  async syncSelective(
    @OrganizationId() organizationId: string,
    @Body() dto: SelectiveSyncRepositoriesDto,
  ) {
    const result = await this.repositoriesService.syncFromIntegration(
      organizationId,
      dto.integrationId,
      dto.externalIds,
    );
    return { result };
  }

  @Post('sync/:integrationId')
  @ApiOperation({ summary: 'Sync repositories from a specific integration' })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    type: SyncResultResponseDto,
  })
  async syncFromIntegration(
    @OrganizationId() organizationId: string,
    @Param('integrationId') integrationId: string,
  ) {
    const result = await this.repositoriesService.syncFromIntegration(
      organizationId,
      integrationId,
    );
    return { result };
  }

  @Get('remote')
  @ApiOperation({
    summary: 'List remote repositories from connected git providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Remote repositories',
    type: [RemoteRepositoryResponseDto],
  })
  async listRemote(@OrganizationId() organizationId: string) {
    const repositories =
      await this.repositoriesService.listRemoteRepositories(organizationId);
    return { repositories };
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update repositories' })
  @ApiResponse({
    status: 200,
    description: 'Updated repositories',
    type: BulkUpdateResultResponseDto,
  })
  async bulkUpdate(
    @OrganizationId() organizationId: string,
    @Body() dto: BulkUpdateRepositoriesDto,
  ) {
    const result = await this.repositoriesService.bulkUpdate(
      organizationId,
      dto,
    );
    return { result };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete repositories' })
  @ApiResponse({
    status: 200,
    description: 'Deleted repositories',
    type: BulkDeleteResultResponseDto,
  })
  async bulkDelete(
    @OrganizationId() organizationId: string,
    @Body() dto: BulkDeleteRepositoriesDto,
  ) {
    const result = await this.repositoriesService.bulkDelete(
      organizationId,
      dto.ids,
    );
    return { result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single repository' })
  @ApiResponse({
    status: 200,
    description: 'Repository details',
    type: RepositoryWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const repository = await this.repositoriesService.findOne(
      organizationId,
      id,
    );
    return { repository };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update repository settings' })
  @ApiResponse({
    status: 200,
    description: 'Repository updated',
    type: RepositoryWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRepositoryDto,
  ) {
    const repository = await this.repositoriesService.update(
      organizationId,
      id,
      dto,
    );
    return { repository };
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync a single repository from remote' })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
  })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async syncOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.repositoriesService.syncOne(organizationId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a repository' })
  @ApiResponse({ status: 204, description: 'Repository deleted' })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.repositoriesService.remove(organizationId, id);
  }
}
