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
import { AICredentialsService } from '../services/ai-credentials.service';
import {
  CreateAICredentialDto,
  UpdateAICredentialDto,
  TestAICredentialDto,
  AICredentialWrapperResponseDto,
  AICredentialListResponseDto,
  TestAIConnectionResponseDto,
} from '../dto/ai-credential.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { StrictRateLimit } from '../../../shared/decorators/throttle.decorator';
import { AuditService } from '../../../shared/audit';

@ApiTags('AI Credentials')
@ApiBearerAuth('bearer')
@Controller('api/v1/ai-credentials')
@UseGuards(AuthGuard)
@StrictRateLimit()
export class AICredentialsController {
  constructor(
    private readonly aiCredentialsService: AICredentialsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create AI credential' })
  @ApiResponse({
    status: 201,
    description: 'Credential created',
    type: AICredentialWrapperResponseDto,
  })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateAICredentialDto,
    @Req() req: Request,
  ) {
    const credential = await this.aiCredentialsService.create(
      organizationId,
      dto,
    );

    await this.auditService.logCreate(
      { organizationId, ...this.auditService.extractContext(req) },
      'ai_credential',
      credential.id,
      `Created AI credential: ${credential.provider}`,
    );

    return { credential };
  }

  @Get()
  @ApiOperation({ summary: 'List all AI credentials' })
  @ApiResponse({
    status: 200,
    description: 'List of credentials',
    type: AICredentialListResponseDto,
  })
  async findAll(@OrganizationId() organizationId: string) {
    const credentials = await this.aiCredentialsService.findAll(organizationId);
    return { credentials };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test AI provider connection before saving' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    type: TestAIConnectionResponseDto,
  })
  async testBeforeConnect(@Body() dto: TestAICredentialDto) {
    return this.aiCredentialsService.testBeforeConnect(
      dto.provider,
      dto.apiKey,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI credential by ID' })
  @ApiResponse({
    status: 200,
    description: 'Credential details',
    type: AICredentialWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const credential = await this.aiCredentialsService.findOne(
      organizationId,
      id,
    );
    return { credential };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update AI credential' })
  @ApiResponse({
    status: 200,
    description: 'Credential updated',
    type: AICredentialWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAICredentialDto,
    @Req() req: Request,
  ) {
    const credential = await this.aiCredentialsService.update(
      organizationId,
      id,
      dto,
    );

    await this.auditService.logUpdate(
      { organizationId, ...this.auditService.extractContext(req) },
      'ai_credential',
      id,
      undefined,
      `Updated AI credential: ${credential.provider}`,
    );

    return { credential };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete AI credential' })
  @ApiResponse({ status: 204, description: 'Credential deleted' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const credential = await this.aiCredentialsService.findOne(
      organizationId,
      id,
    );
    await this.aiCredentialsService.remove(organizationId, id);

    await this.auditService.logDelete(
      { organizationId, ...this.auditService.extractContext(req) },
      'ai_credential',
      id,
      `Deleted AI credential: ${credential.provider}`,
    );
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test AI credential connection' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    type: TestAIConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async testConnection(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.aiCredentialsService.testConnection(organizationId, id);
  }
}
