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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AgentsService } from '../services/agents.service';
import {
  CreateAgentDefinitionDto,
  UpdateAgentDefinitionDto,
} from '../dto/agent.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Presets')
@ApiBearerAuth('bearer')
@Controller('api/v1/presets')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create agent definition' })
  @ApiResponse({ status: 201 })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateAgentDefinitionDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId || 'system';
    const agent = await this.agentsService.create(organizationId, userId, dto);
    return { agent };
  }

  @Get()
  @ApiOperation({ summary: 'List agent definitions' })
  @ApiResponse({ status: 200 })
  async findAll(@OrganizationId() organizationId: string) {
    const agents = await this.agentsService.findAll(organizationId);
    return { agents };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent definition' })
  @ApiResponse({ status: 200 })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const agent = await this.agentsService.findOne(organizationId, id);
    return { agent };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent definition' })
  @ApiResponse({ status: 200 })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDefinitionDto,
  ) {
    const agent = await this.agentsService.update(organizationId, id, dto);
    return { agent };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete agent definition' })
  @ApiResponse({ status: 204 })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.agentsService.remove(organizationId, id);
  }
}
