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
  BadRequestException,
  Req,
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
import {
  SessionContainerService,
  type SessionContainerConfig,
} from '../services/session-container.service';
import { TerminalManagerService } from '../services/terminal-manager.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { EncryptionService } from '../../../shared/encryption/encryption.service';
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
    private readonly terminalManager: TerminalManagerService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── Session CRUD ──────────────────────────────────────────────

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

    // Build repo configs with authenticated clone URLs
    const repos: Array<{
      name: string;
      cloneUrl: string;
      branch: string;
    }> = [];

    for (const sr of session.repositories) {
      let cloneUrl = sr.repository.cloneUrl;

      // Try to get PAT from the repo's integration for authenticated access
      try {
        const integration = await this.prisma.integration.findFirst({
          where: {
            id: sr.repository.integrationId,
            organizationId,
          },
        });

        if (integration?.config && integration?.configIv) {
          const config = this.encryption.decryptJson(
            Buffer.from(integration.config),
            Buffer.from(integration.configIv),
          ) as Record<string, string>;

          const token =
            config.accessToken || config.apiToken || config.token;

          if (token && cloneUrl.startsWith('https://')) {
            // Inject token into clone URL
            const url = new URL(cloneUrl);
            if (sr.repository.provider === 'GITLAB') {
              url.username = 'oauth2';
              url.password = token;
            } else {
              url.username = token;
            }
            cloneUrl = url.toString();
          }
        }
      } catch {
        // Fall back to unauthenticated URL
      }

      repos.push({
        name: sr.repository.name,
        cloneUrl,
        branch: sr.repository.defaultBranch,
      });
    }

    // Load environment if set
    let envConfig: SessionContainerConfig['environment'] | undefined;
    if (dto.environmentId) {
      const env = await this.prisma.environment.findFirst({
        where: { id: dto.environmentId, organizationId },
        include: { variables: true },
      });
      if (env) {
        envConfig = {
          memoryMb: env.memoryMb,
          cpuCores: env.cpuCores,
          setupScript: env.setupScript,
          variables: env.variables.map((v) => ({
            key: v.key,
            value: v.value,
          })),
        };
      }
    }

    setImmediate(async () => {
      try {
        const containerId = await this.containerService.createAndStart({
          sessionId: session.id,
          organizationId,
          repos,
          instructions: session.instructions,
          provider: session.aiCredential?.provider,
          environment: envConfig,
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
  @ApiOperation({ summary: 'Delete session and stop container' })
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    this.terminalManager.closeByPrefix(`${id}:`);

    if (session.containerId) {
      await this.containerService.stopContainer(session.containerId);
      await this.containerService.removeContainer(session.containerId);
    }

    await this.sessionsService.remove(organizationId, id);
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

    if (
      !session.containerId ||
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException('Container is no longer running');
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
  @ApiOperation({ summary: 'Execute command in session container (non-interactive)' })
  async exec(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: { command: string; timeout?: number },
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
    @Body() body?: { terminalId?: string; cmd?: string[] },
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Session is not running');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    const terminalId =
      body?.terminalId || `${id}:term-${Date.now()}`;
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
    @Body() body: { input: string },
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

    const files = await this.containerService.getFileTree(
      session.containerId,
      path || '/workspace',
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

    const content = await this.containerService.readFile(
      session.containerId,
      filePath,
    );
    return { path: filePath, content };
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

    await this.containerService.execCommand(session.containerId, [
      'rm',
      '-f',
      filePath,
    ]);
    return { status: 'deleted' };
  }

  @Post(':id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Write file content' })
  async writeFile(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: { path: string; content: string },
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (
      !session.containerId ||
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
