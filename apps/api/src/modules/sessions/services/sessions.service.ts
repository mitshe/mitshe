import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { SessionStatus, Prisma } from '@prisma/client';
import { CreateSessionDto } from '../dto/session.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  /** Tracks sessions with an active Claude invocation */
  private readonly activeExecs = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateSessionDto) {
    const session = await this.prisma.agentSession.create({
      data: {
        organizationId,
        name: dto.name,
        projectId: dto.projectId || null,
        aiCredentialId: dto.aiCredentialId || null,
        instructions: dto.instructions || '',
        createdBy: userId,
        repositories: {
          create: dto.repositoryIds.map((repositoryId) => ({ repositoryId })),
        },
      },
      include: {
        repositories: { include: { repository: true } },
        project: { select: { id: true, name: true, key: true } },
        aiCredential: { select: { id: true, provider: true } },
      },
    });

    return session;
  }

  async findAll(
    organizationId: string,
    filters?: { status?: SessionStatus; projectId?: string },
  ) {
    return this.prisma.agentSession.findMany({
      where: {
        organizationId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
      },
      include: {
        repositories: { include: { repository: true } },
        project: { select: { id: true, name: true, key: true } },
        aiCredential: { select: { id: true, provider: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, organizationId },
      include: {
        repositories: { include: { repository: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        project: { select: { id: true, name: true, key: true } },
        aiCredential: { select: { id: true, provider: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session;
  }

  async remove(organizationId: string, id: string) {
    const session = await this.findOne(organizationId, id);

    await this.prisma.agentSession.delete({ where: { id: session.id } });

    return session;
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    containerId?: string | null,
  ) {
    return this.prisma.agentSession.update({
      where: { id },
      data: {
        status,
        ...(containerId !== undefined && { containerId }),
      },
    });
  }

  async updateContainerId(id: string, containerId: string | null) {
    return this.prisma.agentSession.update({
      where: { id },
      data: { containerId },
    });
  }

  async touchLastActive(id: string) {
    return this.prisma.agentSession.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  async saveMessage(
    sessionId: string,
    role: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.sessionMessage.create({
      data: {
        sessionId,
        role,
        content,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Acquire exec lock for a session. Returns false if already locked.
   */
  acquireExecLock(sessionId: string): boolean {
    if (this.activeExecs.has(sessionId)) {
      return false;
    }
    this.activeExecs.add(sessionId);
    return true;
  }

  releaseExecLock(sessionId: string): void {
    this.activeExecs.delete(sessionId);
  }

  isExecActive(sessionId: string): boolean {
    return this.activeExecs.has(sessionId);
  }
}
