import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { SessionsService } from '../services/sessions.service';
import { SessionContainerService } from '../services/session-container.service';
import { TerminalManagerService } from '../services/terminal-manager.service';
import { EventsGateway } from '../../../infrastructure/websocket/events.gateway';
import {
  CreateSessionDto,
  ExecCommandDto,
  RecreateSessionDto,
  UpdateSessionMetadataDto,
  WriteFileDto,
  StartTerminalDto,
  TerminalInputDto,
  SessionListResponseDto,
  SessionDetailResponseDto,
} from '../dto/session.dto';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId, UserId } from '../../../shared/decorators/organization.decorator';
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
    private readonly terminalManager: TerminalManagerService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Validate and resolve a file path to ensure it's under /workspace.
   * Prevents path traversal attacks (e.g., ../../etc/passwd).
   */
  private validateFilePath(filePath: string): string {
    const WORKSPACE = '/workspace';
    // Resolve to absolute path relative to workspace
    const resolved = filePath.startsWith('/')
      ? path.resolve(filePath)
      : path.resolve(WORKSPACE, filePath);

    if (!resolved.startsWith(WORKSPACE + '/') && resolved !== WORKSPACE) {
      throw new BadRequestException('Path must be within /workspace');
    }

    return resolved;
  }

  // ─── Session CRUD ──────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create and start a new agent session' })
  @ApiResponse({ status: 201, type: SessionDetailResponseDto })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateSessionDto,
    @UserId() userId: string,
  ) {
    const session = await this.sessionsService.create(
      organizationId,
      userId,
      dto,
    );

    const [repos, integrationConfigs, envConfig] = await Promise.all([
      this.sessionsService.buildRepoConfigs(session.repositories, organizationId),
      this.sessionsService.resolveIntegrationConfigs(
        dto.integrationIds, organizationId, dto.environmentId, session.id,
      ),
      dto.environmentId
        ? this.sessionsService.loadEnvironmentConfig(dto.environmentId, organizationId)
        : undefined,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setImmediate(async () => {
      try {
        const containerId = await this.containerService.createAndStart({
          sessionId: session.id,
          organizationId,
          repos,
          instructions: session.instructions,
          provider: session.aiCredential?.provider,
          enableDocker: session.enableDocker,
          environment: envConfig,
          integrations: integrationConfigs.length > 0 ? integrationConfigs : undefined,
        });

        await this.sessionsService.updateStatus(session.id, 'RUNNING', containerId);
        this.eventsGateway.emitSessionStatus(organizationId, session.id, 'RUNNING');
      } catch (err) {
        await this.sessionsService.updateStatus(session.id, 'FAILED');
        this.eventsGateway.emitSessionStatus(
          organizationId, session.id, 'FAILED', (err as Error).message,
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Update session metadata (name, projectId, instructions)',
  })
  @ApiResponse({ status: 200, type: SessionDetailResponseDto })
  async updateMetadata(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSessionMetadataDto,
  ) {
    const session = await this.sessionsService.updateMetadata(
      organizationId,
      id,
      dto,
    );
    return { session };
  }

  @Put(':id')
  @ApiOperation({
    summary:
      'Reconfigure and recreate a stopped session container (preserves session ID and workspace)',
  })
  @ApiResponse({ status: 200, type: SessionDetailResponseDto })
  async recreate(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: RecreateSessionDto,
  ) {
    const existing = await this.sessionsService.findOne(organizationId, id);

    if (existing.status !== 'COMPLETED' && existing.status !== 'FAILED') {
      throw new BadRequestException(
        'Session must be stopped (COMPLETED or FAILED) to reconfigure. Stop it first.',
      );
    }

    const { session } = await this.sessionsService.applyRecreateConfig(
      organizationId,
      id,
      dto,
    );

    const previousContainerId = existing.containerId;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setImmediate(async () => {
      let snapshotImage: string | null = null;
      try {
        if (previousContainerId) {
          const state = await this.containerService.getContainerState(previousContainerId);
          if (state !== 'gone') {
            snapshotImage = await this.containerService.commitContainer(
              previousContainerId, `${id}-${Date.now()}`,
            );
          }
        }

        this.terminalManager.closeByPrefix(`${id}:`);
        if (previousContainerId) {
          await this.containerService.stopContainer(previousContainerId);
          await this.containerService.removeContainer(previousContainerId);
        }

        const sessionIntegrationIds = session.integrations.map((i) => i.integrationId);
        const [repos, integrationConfigs, envConfig] = await Promise.all([
          this.sessionsService.buildRepoConfigs(session.repositories, organizationId),
          this.sessionsService.resolveIntegrationConfigs(
            sessionIntegrationIds, organizationId, session.environmentId,
          ),
          session.environmentId
            ? this.sessionsService.loadEnvironmentConfig(session.environmentId, organizationId)
            : undefined,
        ]);

        const containerId = await this.containerService.createAndStart({
          sessionId: id,
          organizationId,
          repos,
          instructions: session.instructions,
          provider: session.aiCredential?.provider,
          enableDocker: session.enableDocker,
          environment: envConfig,
          integrations: integrationConfigs.length > 0 ? integrationConfigs : undefined,
          image: snapshotImage ?? undefined,
        });

        await this.sessionsService.updateStatus(id, 'RUNNING', containerId);
        this.eventsGateway.emitSessionStatus(organizationId, id, 'RUNNING');

        if (snapshotImage) {
          await this.containerService.removeImage(snapshotImage);
        }
      } catch (err) {
        await this.sessionsService.updateStatus(id, 'FAILED');
        this.eventsGateway.emitSessionStatus(
          organizationId, id, 'FAILED', (err as Error).message,
        );
      }
    });

    return { session };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete session and stop container' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    this.terminalManager.closeByPrefix(`${id}:`);

    if (session.containerId) {
      await this.containerService.stopContainer(session.containerId);
      await this.containerService.removeContainer(session.containerId, id);
    }

    await this.sessionsService.remove(organizationId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone session with Docker snapshot' })
  @ApiResponse({ status: 201, type: SessionDetailResponseDto })
  async clone(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    const sourceSession = await this.sessionsService.findOne(
      organizationId,
      id,
    );

    if (!sourceSession.containerId) {
      throw new BadRequestException(
        'Source session has no container to clone',
      );
    }

    const cloned = await this.sessionsService.clone(
      organizationId,
      userId,
      id,
    );

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setImmediate(async () => {
      try {
        // 1. Commit source container to image
        const imageName = await this.containerService.commitContainer(
          sourceSession.containerId!,
          cloned.id,
        );

        const envConfig = sourceSession.environmentId
          ? await this.sessionsService.loadEnvironmentConfig(sourceSession.environmentId, organizationId)
          : undefined;

        // 2. Create new container from committed image
        const containerId =
          await this.containerService.createFromCommittedImage(imageName, {
            sessionId: cloned.id,
            organizationId,
            enableDocker: sourceSession.enableDocker,
            environment: envConfig,
          });

        // 4. Update status to RUNNING
        await this.sessionsService.updateStatus(
          cloned.id,
          'RUNNING',
          containerId,
        );
        this.eventsGateway.emitSessionStatus(
          organizationId,
          cloned.id,
          'RUNNING',
        );

        // 5. Cleanup: remove the committed image to save disk space
        await this.containerService.removeImage(imageName);
      } catch (err) {
        await this.sessionsService.updateStatus(cloned.id, 'FAILED');
        this.eventsGateway.emitSessionStatus(
          organizationId,
          cloned.id,
          'FAILED',
          (err as Error).message,
        );
      }
    });

    return { session: cloned };
  }

  // ─── Session Lifecycle ─────────────────────────────────────────

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause session (terminals keep running)' })
  async pause(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause a running session');
    }

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
      throw new BadRequestException(
        'Can only resume a paused or completed session',
      );
    }

    if (!session.containerId) {
      throw new BadRequestException('No container associated with this session');
    }

    const containerState = await this.containerService.getContainerState(
      session.containerId,
    );

    if (containerState === 'gone') {
      throw new BadRequestException(
        'Container no longer exists and cannot be recovered',
      );
    }

    if (containerState === 'stopped') {
      await this.containerService.restartContainer(session.containerId);
    }

    await this.sessionsService.updateStatus(id, 'RUNNING');
    this.eventsGateway.emitSessionStatus(organizationId, id, 'RUNNING');
    return { status: 'running' };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop all terminals (container stays for resume)' })
  async stop(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING' && session.status !== 'PAUSED') {
      throw new BadRequestException('Session is already stopped');
    }

    this.terminalManager.closeByPrefix(`${id}:`);

    await this.sessionsService.updateStatus(id, 'COMPLETED');
    this.eventsGateway.emitSessionStatus(organizationId, id, 'COMPLETED');
    return { status: 'completed' };
  }

  // ─── Command Execution (non-interactive, for workflows) ────────

  @Post(':id/exec')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute command in session container (non-interactive)',
  })
  async exec(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: ExecCommandDto,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'RUNNING' && session.status !== 'PAUSED') {
      throw new BadRequestException('Session is not running');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    const startTime = Date.now();
    const cmd = ['bash', '-c', body.command];
    const stdout = await this.containerService.execCommand(
      session.containerId,
      cmd,
    );

    return {
      stdout,
      exitCode: 0,
      duration: Date.now() - startTime,
    };
  }

  // ─── Terminal Management ───────────────────────────────────────

  @Post(':id/terminals')
  @ApiOperation({ summary: 'Start a new terminal in the session' })
  async startTerminal(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body?: StartTerminalDto,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Session is not running');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    const terminalId = body?.terminalId || `${id}:term-${Date.now()}`;
    const cmd = body?.cmd || ['bash'];

    // Already active — return buffer for reconnect
    if (this.terminalManager.isActive(terminalId)) {
      const buffer = this.terminalManager.getBuffer(terminalId);
      return { terminalId, status: 'already_active', buffer };
    }

    await this.terminalManager.start(
      terminalId,
      session.containerId,
      (data) => {
        this.eventsGateway.emitSessionOutput(terminalId, data);
      },
      () => {
        this.eventsGateway.emitSessionOutput(
          terminalId,
          '\r\n\x1b[90m[Process exited]\x1b[0m\r\n',
        );
      },
      { cmd },
    );

    const buffer = this.terminalManager.getBuffer(terminalId);
    return { terminalId, status: 'started', buffer };
  }

  @Delete(':id/terminals/:terminalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a terminal' })
  async closeTerminal(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('terminalId') terminalId: string,
  ) {
    await this.sessionsService.findOne(organizationId, id);
    this.terminalManager.close(terminalId);
    return { status: 'closed' };
  }

  @Post(':id/terminals/:terminalId/input')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send input to a terminal' })
  async sendTerminalInput(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('terminalId') terminalId: string,
    @Body() body: TerminalInputDto,
  ) {
    await this.sessionsService.findOne(organizationId, id);

    const sent = this.terminalManager.sendInput(terminalId, body.input);
    if (!sent) {
      throw new BadRequestException('Terminal not active');
    }

    await this.sessionsService.touchLastActive(id);
    return { status: 'sent' };
  }

  // ─── File Operations ───────────────────────────────────────────

  @Get(':id/files')
  @ApiOperation({ summary: 'Get file tree' })
  async getFiles(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('path') path?: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (
      !session.containerId ||
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      return { files: [] };
    }

    const safePath = path ? this.validateFilePath(path) : '/workspace';
    const files = await this.containerService.getFileTree(
      session.containerId,
      safePath,
    );
    return { files };
  }

  @Get(':id/git-status')
  @ApiOperation({ summary: 'Get git status' })
  async getGitStatus(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (
      !session.containerId ||
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      return { statuses: [] };
    }

    const statuses = await this.containerService.getGitStatus(
      session.containerId,
    );
    return { statuses };
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Read file content' })
  async readFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (
      !session.containerId ||
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException('Container is not running');
    }

    const safePath = this.validateFilePath(filePath);
    const content = await this.containerService.readFile(
      session.containerId,
      safePath,
    );
    return { path: safePath, content };
  }

  @Delete(':id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    const safePath = this.validateFilePath(filePath);
    await this.containerService.execCommand(session.containerId, [
      'rm',
      '-f',
      safePath,
    ]);
    return { status: 'deleted' };
  }

  @Post(':id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Write file content' })
  async writeFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: WriteFileDto,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (
      !session.containerId ||
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException('Container is not running');
    }

    const safePath = this.validateFilePath(body.path);
    await this.containerService.writeFile(
      session.containerId,
      safePath,
      body.content,
    );
    return { status: 'saved' };
  }
}
