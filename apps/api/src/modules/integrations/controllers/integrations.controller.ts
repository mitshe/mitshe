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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { IntegrationsService } from '../services/integrations.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  IntegrationWrapperResponseDto,
  IntegrationListResponseDto,
  WebhookUrlResponseDto,
  TestConnectionResponseDto,
} from '../dto/integration.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { OrganizationService } from '../../../shared/services/organization.service';
import { StrictRateLimit } from '../../../shared/decorators/throttle.decorator';
import { AuditService } from '../../../shared/audit';

@ApiTags('Integrations')
@ApiBearerAuth('bearer')
@Controller('api/v1/integrations')
@UseGuards(AuthGuard)
@StrictRateLimit()
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly organizationService: OrganizationService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new integration' })
  @ApiResponse({
    status: 201,
    description: 'Integration created successfully',
    type: IntegrationWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateIntegrationDto,
    @Req() req: Request,
  ) {
    const integration = await this.integrationsService.create(
      organizationId,
      dto,
    );

    await this.auditService.logIntegrationConnected(
      { organizationId, ...this.auditService.extractContext(req) },
      dto.type,
      integration.id,
    );

    return { integration };
  }

  @Get()
  @ApiOperation({ summary: 'Get all integrations for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of integrations',
    type: IntegrationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@OrganizationId() organizationId: string) {
    const integrations = await this.integrationsService.findAll(organizationId);
    return { integrations };
  }

  @Get('webhook-url')
  @ApiOperation({ summary: 'Get webhook URL for integrations' })
  @ApiResponse({
    status: 200,
    description: 'Returns webhook URLs for configuring external services',
    type: WebhookUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWebhookUrl(@OrganizationId() organizationId: string) {
    const settings = await this.organizationService.getSettings(organizationId);
    const baseUrl = process.env.API_BASE_URL || 'https://api.yourdomain.com';

    return {
      webhookToken: settings.webhookToken,
      urls: {
        jira: `${baseUrl}/webhooks/jira/${settings.webhookToken}`,
        gitlab: `${baseUrl}/webhooks/gitlab/${settings.webhookToken}`,
        github: `${baseUrl}/webhooks/github/${settings.webhookToken}`,
        trello: `${baseUrl}/webhooks/trello/${settings.webhookToken}`,
      },
    };
  }

  @Post('webhook-url/regenerate')
  @ApiOperation({ summary: 'Regenerate webhook token' })
  @ApiResponse({
    status: 200,
    description: 'New webhook URLs generated',
    type: WebhookUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateWebhookUrl(@OrganizationId() organizationId: string) {
    const newToken =
      await this.organizationService.regenerateWebhookToken(organizationId);
    const baseUrl = process.env.API_BASE_URL || 'https://api.yourdomain.com';

    return {
      webhookToken: newToken,
      urls: {
        jira: `${baseUrl}/webhooks/jira/${newToken}`,
        gitlab: `${baseUrl}/webhooks/gitlab/${newToken}`,
        github: `${baseUrl}/webhooks/github/${newToken}`,
        trello: `${baseUrl}/webhooks/trello/${newToken}`,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an integration by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the integration',
    type: IntegrationWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const integration = await this.integrationsService.findOne(
      organizationId,
      id,
    );
    return { integration };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an integration' })
  @ApiResponse({
    status: 200,
    description: 'Integration updated successfully',
    type: IntegrationWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
    @Req() req: Request,
  ) {
    const integration = await this.integrationsService.update(
      organizationId,
      id,
      dto,
    );

    await this.auditService.logUpdate(
      { organizationId, ...this.auditService.extractContext(req) },
      'integration',
      id,
      undefined,
      `Updated ${integration.type} integration`,
    );

    return { integration };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an integration' })
  @ApiResponse({ status: 204, description: 'Integration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const integration = await this.integrationsService.findOne(
      organizationId,
      id,
    );
    await this.integrationsService.remove(organizationId, id);

    await this.auditService.logIntegrationDisconnected(
      { organizationId, ...this.auditService.extractContext(req) },
      integration.type,
      id,
    );
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    type: TestConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testConnection(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.integrationsService.testConnection(organizationId, id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test integration connection before saving' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    type: TestConnectionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testBeforeConnect(@Body() dto: CreateIntegrationDto) {
    return this.integrationsService.testBeforeConnect(dto.type, dto.config);
  }
}
