import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowsService } from '../services/workflows.service';
import { WorkflowOrchestratorService } from '../engine/workflow-orchestrator.service';
import { AuditService } from '../../../shared/audit';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateFromTemplateDto,
  WorkflowFilterDto,
  ExecutionFilterDto,
  WorkflowWrapperResponseDto,
  WorkflowWithMessageResponseDto,
  WorkflowListResponseDto,
  TemplateWrapperResponseDto,
  TemplateListResponseDto,
  ExecutionWrapperResponseDto,
  ExecutionListResponseDto,
  ExecutionStartResponseDto,
  ExecutionRetryResponseDto,
  ExecutionCancelResponseDto,
} from '../dto/workflow.dto';
import { AuthGuard } from '@/shared/auth';
import {
  OrganizationId,
  UserId,
} from '@/shared/decorators/organization.decorator';
import { ApiRateLimit } from '@/shared/decorators/throttle.decorator';

@ApiTags('Workflows')
@ApiBearerAuth('bearer')
@Controller('api/v1/workflows')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly orchestrator: WorkflowOrchestratorService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: WorkflowWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateWorkflowDto,
    @Req() req: Request,
  ) {
    const workflow = await this.workflowsService.create(
      organizationId,
      userId,
      dto,
    );

    await this.auditService.logCreate(
      { organizationId, ...this.auditService.extractContext(req) },
      'workflow',
      workflow.id,
      `Created workflow: ${workflow.name}`,
    );

    return { workflow };
  }

  // =========================================================================
  // Template Endpoints
  // =========================================================================

  @Get('templates')
  @ApiOperation({ summary: 'Get all available workflow templates' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of templates',
    type: TemplateListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTemplates() {
    const templates = this.workflowsService.getTemplates();
    return { templates };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get a specific workflow template' })
  @ApiResponse({
    status: 200,
    description: 'Returns the template',
    type: TemplateWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTemplate(@Param('templateId') templateId: string) {
    const template = this.workflowsService.getTemplate(templateId);
    return { template };
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create a workflow from a template' })
  @ApiResponse({
    status: 201,
    description: 'Workflow created from template',
    type: WorkflowWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFromTemplate(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateFromTemplateDto,
  ) {
    const workflow = await this.workflowsService.createFromTemplate(
      organizationId,
      userId,
      dto,
    );
    return { workflow };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all workflows with optional filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of workflows',
    type: WorkflowListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
  })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query() filter: WorkflowFilterDto,
  ) {
    return this.workflowsService.findAll(organizationId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the workflow',
    type: WorkflowWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const workflow = await this.workflowsService.findOne(organizationId, id);
    return { workflow };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: WorkflowWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
    @Req() req: Request,
  ) {
    const workflow = await this.workflowsService.update(
      organizationId,
      id,
      dto,
    );

    await this.auditService.logUpdate(
      { organizationId, ...this.auditService.extractContext(req) },
      'workflow',
      id,
      undefined,
      `Updated workflow: ${workflow.name}`,
    );

    return { workflow };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const workflow = await this.workflowsService.findOne(organizationId, id);
    await this.workflowsService.remove(organizationId, id);

    await this.auditService.logDelete(
      { organizationId, ...this.auditService.extractContext(req) },
      'workflow',
      id,
      `Deleted workflow: ${workflow.name}`,
    );
  }

  // =========================================================================
  // Activation Endpoints
  // =========================================================================

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow activated',
    type: WorkflowWithMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async activate(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const workflow = await this.workflowsService.activate(organizationId, id);
    return { workflow, message: 'Workflow activated' };
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow deactivated',
    type: WorkflowWithMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivate(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const workflow = await this.workflowsService.deactivate(organizationId, id);
    return { workflow, message: 'Workflow deactivated' };
  }

  // =========================================================================
  // Execution Endpoints
  // =========================================================================

  @Get(':id/executions')
  @ApiOperation({
    summary: 'Get all executions for a workflow with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of executions',
    type: ExecutionListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50, max: 100)',
  })
  async getExecutions(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query() filter: ExecutionFilterDto,
  ) {
    return this.workflowsService.getExecutions(organizationId, id, filter);
  }

  @Get(':id/executions/:executionId')
  @ApiOperation({ summary: 'Get a specific execution' })
  @ApiResponse({
    status: 200,
    description: 'Returns the execution',
    type: ExecutionWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExecution(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('executionId') executionId: string,
  ) {
    const execution = await this.workflowsService.getExecution(
      organizationId,
      id,
      executionId,
    );
    return { execution };
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Manually run a workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow execution started',
    type: ExecutionStartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async runWorkflow(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() body: { triggerData?: Record<string, unknown> },
    @Req() req: Request,
  ) {
    const workflow = await this.workflowsService.findOne(organizationId, id);
    const executionId = await this.orchestrator.startExecution(
      organizationId,
      id,
      body.triggerData || {},
      userId,
    );

    await this.auditService.logWorkflowStarted(
      { organizationId, ...this.auditService.extractContext(req) },
      id,
      executionId,
      workflow.name,
    );

    return { executionId, message: 'Workflow execution started' };
  }

  @Post(':id/executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel an execution' })
  @ApiResponse({
    status: 200,
    description: 'Execution cancelled',
    type: ExecutionCancelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelExecution(
    @OrganizationId() organizationId: string,
    @Param('id') _id: string,
    @Param('executionId') executionId: string,
  ) {
    await this.orchestrator.cancelExecution(organizationId, executionId);
    return { message: 'Execution cancelled' };
  }

  @Post(':id/executions/:executionId/retry')
  @ApiOperation({ summary: 'Retry a failed execution' })
  @ApiResponse({
    status: 200,
    description: 'Execution retried',
    type: ExecutionRetryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retryExecution(
    @OrganizationId() organizationId: string,
    @Param('id') _id: string,
    @Param('executionId') executionId: string,
  ) {
    const newExecutionId = await this.orchestrator.retryExecution(
      organizationId,
      executionId,
    );
    return { executionId: newExecutionId, message: 'Execution retried' };
  }

  @Get(':id/executions/:executionId/details')
  @ApiOperation({ summary: 'Get detailed execution information' })
  @ApiResponse({ status: 200, description: 'Returns execution details' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExecutionDetails(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('executionId') executionId: string,
  ) {
    const details = await this.workflowsService.getExecutionDetails(
      organizationId,
      id,
      executionId,
    );
    return details;
  }
}
