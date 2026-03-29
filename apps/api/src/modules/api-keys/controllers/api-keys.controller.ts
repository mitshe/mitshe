import {
  Controller,
  Get,
  Post,
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
import { ApiKeysService } from '../services/api-keys.service';
import {
  CreateApiKeyDto,
  ApiKeyWrapperResponseDto,
  ApiKeyListResponseDto,
} from '../dto/api-key.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { StrictRateLimit } from '../../../shared/decorators/throttle.decorator';
import { AuditService } from '../../../shared/audit';

@ApiTags('API Keys')
@ApiBearerAuth('bearer')
@Controller('api/v1/api-keys')
@UseGuards(AuthGuard)
@StrictRateLimit()
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created. The full key is only returned once.',
    type: ApiKeyWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: Request,
  ) {
    const result = await this.apiKeysService.create(organizationId, dto);
    // Destructure to return key at top level (only shown once)
    const { key, ...apiKey } = result;

    await this.auditService.logCreate(
      { organizationId, ...this.auditService.extractContext(req) },
      'api_key',
      apiKey.id,
      `Created API key: ${apiKey.name}`,
    );

    return { apiKey, key };
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of API keys (without full key values)',
    type: ApiKeyListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@OrganizationId() organizationId: string) {
    const apiKeys = await this.apiKeysService.findAll(organizationId);
    return { apiKeys };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.apiKeysService.remove(organizationId, id);

    await this.auditService.logDelete(
      { organizationId, ...this.auditService.extractContext(req) },
      'api_key',
      id,
      'Revoked API key',
    );
  }
}
