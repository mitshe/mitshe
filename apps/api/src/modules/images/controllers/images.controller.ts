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
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../../shared/auth';
import {
  OrganizationId,
  UserId,
} from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';
import { ImagesService } from '../services/images.service';
import { CreateImageDto, UpdateImageDto } from '../dto/image.dto';

@ApiTags('Snapshots')
@ApiBearerAuth('bearer')
@Controller('api/v1/snapshots')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create snapshot from a running session' })
  @ApiResponse({ status: 201, description: 'Snapshot creation started' })
  async create(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateImageDto,
  ) {
    const snapshot = await this.imagesService.create(organizationId, userId, dto);
    return { snapshot };
  }

  @Get()
  @ApiOperation({ summary: 'List all snapshots' })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  async findAll(@OrganizationId() organizationId: string) {
    const snapshots = await this.imagesService.findAll(organizationId);
    return { snapshots };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get snapshot details' })
  @ApiResponse({ status: 200, description: 'Snapshot details' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const snapshot = await this.imagesService.findOne(organizationId, id);
    return { snapshot };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update snapshot name/description' })
  @ApiResponse({ status: 200, description: 'Updated snapshot' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
  ) {
    const snapshot = await this.imagesService.update(organizationId, id, dto);
    return { snapshot };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete snapshot and Docker image' })
  @ApiResponse({ status: 204, description: 'Snapshot deleted' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.imagesService.remove(organizationId, id);
  }
}
