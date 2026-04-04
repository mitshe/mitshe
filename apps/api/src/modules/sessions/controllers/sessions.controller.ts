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
  ConflictException,
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
import { EncryptionService } from '../../../shared/encryption/encryption.service';
import { EventsGateway } from '../../../infrastructure/websocket/events.gateway';
import {
  CreateSessionDto,
  SendMessageDto,
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
    private readonly encryption: EncryptionService,
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

    // Create session in DB
    const session = await this.sessionsService.create(
      organizationId,
      userId,
      dto,
    );

    // Decrypt API key if credential provided
    let apiKey: string | undefined;
    if (session.aiCredentialId) {
      const credential = await this.prisma.aICredential.findFirst({
        where: { id: session.aiCredentialId, organizationId },
      });
      if (credential) {
        apiKey = this.encryption.decrypt(
          Buffer.from(credential.encryptedKey),
          Buffer.from(credential.keyIv),
        );
      }
    }

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
          anthropicApiKey: apiKey,
        });

        await this.sessionsService.updateStatus(
          session.id,
          'RUNNING',
          containerId,
        );

        this.eventsGateway.emitToOrganization(
          organizationId,
          'session:status',
          { sessionId: session.id, status: 'RUNNING' },
        );
      } catch (err) {
        await this.sessionsService.updateStatus(session.id, 'FAILED');
        this.eventsGateway.emitToOrganization(
          organizationId,
          'session:status',
          {
            sessionId: session.id,
            status: 'FAILED',
            error: (err as Error).message,
          },
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
  @ApiOperation({ summary: 'Get agent session with messages' })
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

    if (session.containerId) {
      await this.containerService.stopContainer(session.containerId);
      await this.containerService.removeContainer(session.containerId);
    }

    await this.sessionsService.remove(organizationId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message to the agent' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'Agent is already processing' })
  async sendMessage(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);

    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Session is not running');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no container');
    }

    if (!this.sessionsService.acquireExecLock(id)) {
      throw new ConflictException('Agent is already processing a message');
    }

    // Save user message
    await this.sessionsService.saveMessage(id, 'user', dto.content);
    await this.sessionsService.touchLastActive(id);

    // Emit user message to subscribers
    this.eventsGateway.emitToOrganization(
      organizationId,
      'session:message',
      { sessionId: id, role: 'user', content: dto.content },
    );

    // Execute Claude in background and stream events
    const containerId = session.containerId;
    setImmediate(async () => {
      let fullResponse = '';

      try {
        await this.containerService.execClaudeMessage(
          containerId,
          dto.content,
          (event) => {
            // Stream each event to WebSocket subscribers
            this.eventsGateway.emitToOrganization(
              organizationId,
              'session:event',
              { sessionId: id, event },
            );

            // Accumulate assistant text
            if (
              event.type === 'assistant' &&
              typeof event.message === 'string'
            ) {
              fullResponse += event.message;
            } else if (
              event.type === 'content_block_delta' &&
              typeof event.delta === 'object' &&
              event.delta &&
              'text' in event.delta
            ) {
              fullResponse += (event.delta as any).text;
            }
          },
        );

        // Save assistant response
        if (fullResponse) {
          await this.sessionsService.saveMessage(id, 'assistant', fullResponse);
        }

        // Signal completion
        this.eventsGateway.emitToOrganization(
          organizationId,
          'session:message-complete',
          { sessionId: id },
        );
      } catch (err) {
        this.eventsGateway.emitToOrganization(
          organizationId,
          'session:error',
          { sessionId: id, error: (err as Error).message },
        );
      } finally {
        this.sessionsService.releaseExecLock(id);
      }
    });

    return { status: 'processing' };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause agent session' })
  async pause(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause a running session');
    }
    await this.sessionsService.updateStatus(id, 'PAUSED');
    this.eventsGateway.emitToOrganization(organizationId, 'session:status', {
      sessionId: id,
      status: 'PAUSED',
    });
    return { status: 'paused' };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume agent session' })
  async resume(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'PAUSED') {
      throw new BadRequestException('Can only resume a paused session');
    }

    // Check if container is still running
    if (
      session.containerId &&
      !(await this.containerService.isContainerRunning(session.containerId))
    ) {
      throw new BadRequestException(
        'Container is no longer running, session cannot be resumed',
      );
    }

    await this.sessionsService.updateStatus(id, 'RUNNING');
    this.eventsGateway.emitToOrganization(organizationId, 'session:status', {
      sessionId: id,
      status: 'RUNNING',
    });
    return { status: 'running' };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop and complete agent session' })
  async stop(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(organizationId, id);
    if (session.status !== 'RUNNING' && session.status !== 'PAUSED') {
      throw new BadRequestException('Session is already stopped');
    }

    if (session.containerId) {
      await this.containerService.stopContainer(session.containerId);
      await this.containerService.removeContainer(session.containerId);
    }

    await this.sessionsService.updateStatus(id, 'COMPLETED', null);
    this.eventsGateway.emitToOrganization(organizationId, 'session:status', {
      sessionId: id,
      status: 'COMPLETED',
    });
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

    if (!session.containerId) {
      return { files: [] };
    }

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
}
