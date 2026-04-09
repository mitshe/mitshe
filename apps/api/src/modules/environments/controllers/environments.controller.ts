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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { EnvironmentsService } from '../services/environments.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from '../dto/environment.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Environments')
@ApiBearerAuth('bearer')
@Controller('api/v1/environments')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create environment' })
  @ApiResponse({ status: 201 })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateEnvironmentDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId || 'system';
    const environment = await this.environmentsService.create(
      organizationId,
      userId,
      dto,
    );
    return { environment };
  }

  @Get()
  @ApiOperation({ summary: 'List environments' })
  @ApiResponse({ status: 200 })
  async findAll(@OrganizationId() organizationId: string) {
    const environments = await this.environmentsService.findAll(organizationId);
    return { environments };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get environment' })
  @ApiResponse({ status: 200 })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const environment = await this.environmentsService.findOne(
      organizationId,
      id,
    );
    return { environment };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update environment' })
  @ApiResponse({ status: 200 })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    const environment = await this.environmentsService.update(
      organizationId,
      id,
      dto,
    );
    return { environment };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete environment' })
  @ApiResponse({ status: 204 })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.environmentsService.remove(organizationId, id);
  }
}
