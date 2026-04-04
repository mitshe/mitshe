import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SessionStatus } from '@prisma/client';
import { SessionsService } from '../services/sessions.service';
import { SessionContainerService } from '../services/session-container.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { EventsGateway } from '../../../infrastructure/websocket/events.gateway';
import {
  CreateSessionDto,
  SessionListResponseDto,
  SessionDetailResponseDto,
} from '../dto/session.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';

@ApiTags('Sessions')
@ApiBearerAuth('bearer')
@Controller('api/v1/sessions')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly containerService: SessionContainerService,
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create and start a new agent session' })
  @ApiResponse({ status: 201, type: SessionDetailResponseDto })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateSessionDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId || 'system';

    const session = await this.sessionsService.create(
      organizationId,
      userId,
      dto,
    );

    // Build repo configs
    const repos = session.repositories.map((sr) => ({
      name: sr.repository.name,
      cloneUrl: sr.repository.cloneUrl,
      branch: sr.repository.defaultBranch,
    }));

    // Start container in background
    setImmediate(async () => {
      try {
        const containerId = await this.containerService.createAndStart({
          sessionId: session.id,
          organizationId,
          repos,
          instructions: session.instructions,
        });

        await this.sessionsService.updateStatus(
          session.id,
          'RUNNING',
          containerId,
        );

        this.eventsGateway.emitSessionStatus(
          organizationId,
          session.id,
          'RUNNING',
        );
      } catch (err) {
        await this.sessionsService.updateStatus(session.id, 'FAILED');
        this.eventsGateway.emitSessionStatus(
          organizationId,
          session.id,
          'FAILED',
          (err as Error).message,
        );
      }
    });

    return { session };
  }

  @Get()
  @ApiOperation({ summary: 'List agent sessions' })
  @ApiResponse({ status: 200, type: SessionListResponseDto })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  @ApiQuery({ name: 'projectId', required: false })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('status') status?: SessionStatus,
    @Query('projectId') projectId?: string,
  ) {
    const sessions = await this.sessionsService.findAll(organizationId, {
      status,
      projectId,
    });
    return { sessions };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent session' })
  @ApiResponse({ status: 200, type: SessionDetailResponseDto })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    return { session };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete agent session and stop container' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    this.containerService.closeInteractiveSession(id);

    if (session.containerId) {
      await this.containerService.stopContainer(session.containerId);
      await this.containerService.removeContainer(session.containerId);
    }

    await this.sessionsService.remove(organizationId, id);
  }

  @Post(':id/terminal')
  @ApiOperation({ summary: 'Start or reconnect interactive Claude Code terminal' })
  @ApiResponse({ status: 200 })
  async startTerminal(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body?: { continue?: boolean },
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Session is not running');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    // Already has an active claude process — just return buffer for reconnect
    if (this.containerService.hasActiveSession(id)) {
      const buffer = this.containerService.getOutputBuffer(id);
      return { status: 'already_active', buffer };
    }

    // Start new claude process (with --continue if resuming after stop)
    const shouldContinue = body?.continue === true;

    await this.containerService.startInteractiveSession(
      id,
      session.containerId,
      (data) => {
        this.eventsGateway.emitSessionOutput(id, data);
      },
      () => {
        this.eventsGateway.emitSessionOutput(
          id,
          '\r\n[Claude Code exited]\r\n',
        );
      },
      { continue: shouldContinue },
    );

    const buffer = this.containerService.getOutputBuffer(id);
    return { status: 'started', buffer };
  }

  /**
   * Send terminal input (called from WebSocket handler or REST)
   */
  @Post(':id/input')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send input to the terminal session' })
  async sendInput(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: { input: string },
  ) {
    await this.sessionsService.findOne(organizationId, id);

    const sent = this.containerService.sendInput(id, body.input);
    if (!sent) {
      throw new BadRequestException('No active terminal session');
    }

    await this.sessionsService.touchLastActive(id);
    return { status: 'sent' };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause agent session (freezes state, container stays alive)' })
  async pause(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause a running session');
    }

    // Don't close the interactive session — claude process keeps running.
    // We just change status so frontend knows to disconnect its view.
    await this.sessionsService.updateStatus(id, 'PAUSED');
    this.eventsGateway.emitSessionStatus(organizationId, id, 'PAUSED');
    return { status: 'paused' };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused or stopped session' })
  async resume(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'PAUSED' && session.status !== 'COMPLETED') {
      throw new BadRequestException('Can only resume a paused or completed session');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    // Check if container is still running
    const containerRunning = await this.containerService.isContainerRunning(
      session.containerId,
    );

    if (!containerRunning) {
      throw new BadRequestException(
        'Container is no longer running. Delete this session and create a new one.',
      );
    }

    await this.sessionsService.updateStatus(id, 'RUNNING');
    this.eventsGateway.emitSessionStatus(organizationId, id, 'RUNNING');
    return { status: 'running' };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop claude process (container stays for resume with --continue)' })
  async stop(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING' && session.status !== 'PAUSED') {
      throw new BadRequestException('Session is already stopped');
    }

    // Close the claude process but keep the container alive
    this.containerService.closeInteractiveSession(id);

    // Keep containerId — needed for resume with --continue
    await this.sessionsService.updateStatus(id, 'COMPLETED');
    this.eventsGateway.emitSessionStatus(organizationId, id, 'COMPLETED');
    return { status: 'completed' };
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get file tree from session container' })
  async getFiles(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('path') path?: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (!session.containerId) return { files: [] };

    if (
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      return { files: [] };
    }

    const files = await this.containerService.getFileTree(
      session.containerId,
      path || '/workspace',
    );
    return { files };
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Read file content from session container' })
  async readFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    if (
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException('Container is not running');
    }

    const content = await this.containerService.readFile(
      session.containerId,
      filePath,
    );
    return { path: filePath, content };
  }

  @Post(':id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Write file content to session container' })
  async writeFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: { path: string; content: string },
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    if (
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException('Container is not running');
    }

    await this.containerService.writeFile(
      session.containerId,
      body.path,
      body.content,
    );
    return { status: 'saved' };
  }
}
