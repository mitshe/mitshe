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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';
import { TaskImportService } from '../services/task-import.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
  TaskWrapperResponseDto,
  TaskWithMessageResponseDto,
  TaskListResponseDto,
  WorkflowExecutionResponseDto,
} from '../dto/task.dto';
import {
  ImportPreviewDto,
  ImportConfirmDto,
  RunWorkflowDto,
  ImportPreviewResponseDto,
} from '../dto/task-import.dto';
import { AuthGuard } from '@/shared/auth';
import {
  OrganizationId,
  UserId,
} from '../../../shared/decorators/organization.decorator';
import { WorkflowOrchestratorService } from '../../workflows/engine/workflow-orchestrator.service';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('bearer')
@Controller('api/v1/tasks')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskImportService: TaskImportService,
    private readonly workflowOrchestrator: WorkflowOrchestratorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskWrapperResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(organizationId, userId, dto);
    return { task };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tasks with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of tasks',
    type: TaskListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'externalIssueId',
    required: false,
    description: 'Filter by external issue ID',
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
    @Query() filter: TaskFilterDto,
  ) {
    return this.tasksService.findAll(organizationId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the task',
    type: TaskWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.findOne(organizationId, id);
    return { task };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskWrapperResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(organizationId, id, dto);
    return { task };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.tasksService.remove(organizationId, id);
  }

  // =========================================================================
  // Task Processing Endpoints
  // =========================================================================

  @Post(':id/process')
  @ApiOperation({ summary: 'Start AI processing for a task' })
  @ApiResponse({
    status: 200,
    description: 'Task processing started',
    type: TaskWithMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startProcessing(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.startProcessing(organizationId, id);
    return { task, message: 'Task processing started' };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiResponse({
    status: 200,
    description: 'Task cancelled',
    type: TaskWithMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancel(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.cancel(organizationId, id);
    return { task, message: 'Task cancelled' };
  }

  // =========================================================================
  // Import Endpoints
  // =========================================================================

  @Post('import/preview')
  @ApiOperation({ summary: 'Preview an external issue before importing' })
  @ApiResponse({
    status: 200,
    description: 'Returns issue preview',
    type: ImportPreviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or integration not configured',
  })
  async importPreview(
    @OrganizationId() organizationId: string,
    @Body() dto: ImportPreviewDto,
  ) {
    const preview = await this.taskImportService.getImportPreview(
      organizationId,
      dto.url,
    );
    return { preview };
  }

  @Post('import/confirm')
  @ApiOperation({ summary: 'Import an external issue as a task' })
  @ApiResponse({
    status: 201,
    description: 'Task created from external issue',
    type: TaskWithMessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or already imported' })
  async importConfirm(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: ImportConfirmDto,
  ) {
    const task = await this.taskImportService.importFromJira(
      organizationId,
      userId,
      dto.url,
      dto.projectId,
    );
    return { task, message: 'Task imported successfully' };
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Refresh external data for an imported task' })
  @ApiResponse({
    status: 200,
    description: 'External data refreshed',
    type: TaskWithMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async refreshExternalData(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const task = await this.taskImportService.refreshExternalData(
      organizationId,
      id,
    );
    return { task, message: 'External data refreshed' };
  }

  // =========================================================================
  // Workflow Execution
  // =========================================================================

  @Post(':id/run-workflow')
  @ApiOperation({ summary: 'Run a workflow with this task as trigger data' })
  @ApiResponse({
    status: 200,
    description: 'Workflow execution started',
    type: WorkflowExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task or workflow not found' })
  async runWorkflow(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: RunWorkflowDto,
  ) {
    // Fetch task with external data
    const task = await this.tasksService.findOne(organizationId, id);

    // Build trigger data with task info
    const triggerData = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        externalSource: task.externalSource,
        externalIssueId: task.externalIssueId,
        externalIssueUrl: task.externalIssueUrl,
      },
      jira: task.externalData || {},
      ...dto.additionalData,
    };

    // Execute workflow
    const executionId = await this.workflowOrchestrator.startExecution(
      organizationId,
      dto.workflowId,
      triggerData,
    );

    return {
      executionId,
      taskId: task.id,
      workflowId: dto.workflowId,
      message: 'Workflow execution started',
    };
  }
}
