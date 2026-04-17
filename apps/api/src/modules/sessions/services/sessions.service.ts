import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { EncryptionService } from '../../../shared/encryption/encryption.service';
import { SessionStatus, Prisma } from '@prisma/client';
import {
  CreateSessionDto,
  RecreateSessionDto,
  UpdateSessionMetadataDto,
} from '../dto/session.dto';
import { SessionContainerConfig } from './session-container.service';

export interface RepoConfig {
  name: string;
  cloneUrl: string;
  branch: string;
}

export interface IntegrationConfig {
  type: string;
  config: Record<string, string>;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  /** Tracks sessions with an active Claude invocation */
  private readonly activeExecs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

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
        baseImageId: dto.baseImageId || null,
        instructions: dto.instructions || '',
        createdBy: userId,
        repositories: {
          create: dto.repositoryIds.map((repositoryId) => ({ repositoryId })),
        },
        integrations: dto.integrationIds?.length
          ? {
              create: dto.integrationIds.map((integrationId) => ({
                integrationId,
              })),
            }
          : undefined,
      },
      include: {
        repositories: { include: { repository: true } },
        integrations: {
          include: {
            integration: { select: { id: true, type: true, status: true } },
          },
        },
        project: { select: { id: true, name: true, key: true } },
        aiCredential: { select: { id: true, provider: true } },
        agentDefinition: { select: { id: true, name: true } },
      },
    });

    return session;
  }

  async resolveSnapshotImage(
    baseImageId: string,
    organizationId: string,
  ): Promise<string | undefined> {
    const snapshot = await this.prisma.baseImage.findFirst({
      where: { id: baseImageId, organizationId, status: 'READY' },
      select: { dockerImage: true },
    });
    return snapshot?.dockerImage || undefined;
  }

  async findAll(
    organizationId: string,
    filters?: {
      status?: SessionStatus;
      projectId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const where = {
      organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.projectId && { projectId: filters.projectId }),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.agentSession.findMany({
        where,
        include: {
          repositories: { include: { repository: true } },
          integrations: {
            include: {
              integration: { select: { id: true, type: true, status: true } },
            },
          },
          project: { select: { id: true, name: true, key: true } },
          aiCredential: { select: { id: true, provider: true } },
          agentDefinition: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { lastActiveAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.agentSession.count({ where }),
    ]);

    return {
      sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, organizationId },
      include: {
        repositories: { include: { repository: true } },
        integrations: {
          include: {
            integration: { select: { id: true, type: true, status: true } },
          },
        },
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

  async updateMetadata(
    organizationId: string,
    id: string,
    dto: UpdateSessionMetadataDto,
  ) {
    await this.findOne(organizationId, id);

    const data: Prisma.AgentSessionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.projectId !== undefined) {
      data.project = dto.projectId
        ? { connect: { id: dto.projectId } }
        : { disconnect: true };
    }

    await this.prisma.agentSession.update({ where: { id }, data });
    return this.findOne(organizationId, id);
  }

  async applyRecreateConfig(
    organizationId: string,
    id: string,
    dto: RecreateSessionDto,
  ) {
    const current = await this.findOne(organizationId, id);

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.AgentSessionUpdateInput = {
        status: 'CREATING',
        containerId: null,
      };

      if (dto.name !== undefined) data.name = dto.name;
      if (dto.instructions !== undefined) data.instructions = dto.instructions;
      if (dto.startArguments !== undefined)
        data.startArguments = dto.startArguments || null;
      if (dto.enableDocker !== undefined) data.enableDocker = dto.enableDocker;

      if (dto.projectId !== undefined) {
        data.project = dto.projectId
          ? { connect: { id: dto.projectId } }
          : { disconnect: true };
      }
      if (dto.aiCredentialId !== undefined) {
        data.aiCredential = dto.aiCredentialId
          ? { connect: { id: dto.aiCredentialId } }
          : { disconnect: true };
      }
      if (dto.agentDefinitionId !== undefined) {
        data.agentDefinition = dto.agentDefinitionId
          ? { connect: { id: dto.agentDefinitionId } }
          : { disconnect: true };
      }
      if (dto.environmentId !== undefined) {
        data.environment = dto.environmentId
          ? { connect: { id: dto.environmentId } }
          : { disconnect: true };
      }

      await tx.agentSession.update({ where: { id }, data });

      if (dto.repositoryIds !== undefined) {
        await tx.sessionRepository.deleteMany({ where: { sessionId: id } });
        if (dto.repositoryIds.length > 0) {
          await tx.sessionRepository.createMany({
            data: dto.repositoryIds.map((repositoryId) => ({
              sessionId: id,
              repositoryId,
            })),
          });
        }
      }

      if (dto.integrationIds !== undefined) {
        await tx.sessionIntegration.deleteMany({ where: { sessionId: id } });
        if (dto.integrationIds.length > 0) {
          await tx.sessionIntegration.createMany({
            data: dto.integrationIds.map((integrationId) => ({
              sessionId: id,
              integrationId,
            })),
          });
        }
      }
    });

    return {
      session: await this.findOne(organizationId, id),
      previous: current,
    };
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
        integrations:
          (source as any).integrations?.length > 0
            ? {
                create: (source as any).integrations.map(
                  (i: { integrationId: string }) => ({
                    integrationId: i.integrationId,
                  }),
                ),
              }
            : undefined,
      },
      include: {
        repositories: { include: { repository: true } },
        integrations: {
          include: {
            integration: { select: { id: true, type: true, status: true } },
          },
        },
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

  async buildRepoConfigs(
    repositories: Array<{
      repository: {
        cloneUrl: string;
        name: string;
        defaultBranch: string;
        provider: string;
        integrationId: string;
      };
    }>,
    organizationId: string,
  ): Promise<RepoConfig[]> {
    const integrationIds = [
      ...new Set(repositories.map((sr) => sr.repository.integrationId)),
    ];
    const integrations =
      integrationIds.length > 0
        ? await this.prisma.integration.findMany({
            where: { id: { in: integrationIds }, organizationId },
          })
        : [];

    const tokenMap = new Map<string, string>();
    for (const integration of integrations) {
      if (integration.config && integration.configIv) {
        try {
          const config = this.encryption.decryptJson<Record<string, string>>(
            Buffer.from(integration.config),
            Buffer.from(integration.configIv),
          );
          const token = config.accessToken || config.apiToken || config.token;
          if (token) tokenMap.set(integration.id, token);
        } catch {
          this.logger.warn(`Failed to decrypt integration ${integration.id}`);
        }
      }
    }

    return repositories.map((sr) => {
      let cloneUrl = sr.repository.cloneUrl;
      const token = tokenMap.get(sr.repository.integrationId);
      if (token && cloneUrl.startsWith('https://')) {
        const url = new URL(cloneUrl);
        if (sr.repository.provider === 'GITLAB') {
          url.username = 'oauth2';
          url.password = token;
        } else {
          url.username = token;
        }
        cloneUrl = url.toString();
      }
      return {
        name: sr.repository.name,
        cloneUrl,
        branch: sr.repository.defaultBranch,
      };
    });
  }

  async resolveIntegrationConfigs(
    sessionIntegrationIds: string[] | undefined,
    organizationId: string,
    environmentId?: string | null,
    sessionId?: string,
  ): Promise<IntegrationConfig[]> {
    let integrationIds = sessionIntegrationIds || [];

    if (integrationIds.length === 0 && environmentId) {
      const envIntegrations = await this.prisma.environmentIntegration.findMany(
        {
          where: { environmentId },
          select: { integrationId: true },
        },
      );
      integrationIds = envIntegrations.map((ei) => ei.integrationId);

      if (integrationIds.length > 0 && sessionId) {
        await this.prisma.sessionIntegration.createMany({
          data: integrationIds.map((integrationId) => ({
            sessionId,
            integrationId,
          })),
        });
      }
    }

    if (integrationIds.length === 0) return [];

    const integrations = await this.prisma.integration.findMany({
      where: {
        id: { in: integrationIds },
        organizationId,
        status: 'CONNECTED',
      },
    });

    const configs: IntegrationConfig[] = [];
    for (const integration of integrations) {
      try {
        const config = this.encryption.decryptJson<Record<string, string>>(
          Buffer.from(integration.config),
          Buffer.from(integration.configIv),
        );
        configs.push({ type: integration.type, config });
      } catch {
        this.logger.warn(`Failed to decrypt integration ${integration.id}`);
      }
    }
    return configs;
  }

  async loadEnvironmentConfig(
    environmentId: string,
    organizationId: string,
  ): Promise<SessionContainerConfig['environment'] | undefined> {
    const env = await this.prisma.environment.findFirst({
      where: { id: environmentId, organizationId },
      include: { variables: true },
    });
    if (!env) return undefined;
    return {
      memoryMb: env.memoryMb,
      cpuCores: env.cpuCores,
      setupScript: env.setupScript,
      variables: env.variables.map((v) => ({ key: v.key, value: v.value })),
    };
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
