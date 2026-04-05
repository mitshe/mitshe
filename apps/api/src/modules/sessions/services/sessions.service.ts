import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
        agentDefinitionId: dto.agentDefinitionId || null,
        startArguments: dto.startArguments || null,
        environmentId: dto.environmentId || null,
        enableDocker: dto.enableDocker ?? false,
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
        agentDefinition: { select: { id: true, name: true } },
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
        agentDefinition: { select: { id: true, name: true } },
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
        agentDefinition: { select: { id: true, name: true } },
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

  async clone(organizationId: string, userId: string, sourceSessionId: string) {
    const source = await this.findOne(organizationId, sourceSessionId);

    const cloned = await this.prisma.agentSession.create({
      data: {
        organizationId,
        name: `${source.name} (Clone)`,
        projectId: source.projectId,
        agentDefinitionId: source.agentDefinitionId,
        aiCredentialId: source.aiCredentialId,
        instructions: source.instructions,
        startArguments: source.startArguments,
        environmentId: source.environmentId,
        enableDocker: source.enableDocker,
        status: 'CREATING',
        createdBy: userId,
        repositories: {
          create: source.repositories.map((r) => ({
            repositoryId: r.repositoryId,
          })),
        },
      },
      include: {
        repositories: { include: { repository: true } },
        project: { select: { id: true, name: true, key: true } },
        aiCredential: { select: { id: true, provider: true } },
        agentDefinition: { select: { id: true, name: true } },
      },
    });

    // Copy messages from source session
    if (source.messages && source.messages.length > 0) {
      await this.prisma.sessionMessage.createMany({
        data: source.messages.map((m) => ({
          sessionId: cloned.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata ?? Prisma.JsonNull,
        })),
      });
    }

    return cloned;
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
