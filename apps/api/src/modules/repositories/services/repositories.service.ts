import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import {
  IntegrationType,
  GitProvider,
  IntegrationStatus,
} from '@prisma/client';
import {
  UpdateRepositoryDto,
  BulkUpdateRepositoriesDto,
} from '../dto/repository.dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
  ) {}

  /**
   * Get all repositories for an organization
   */
  async findAll(organizationId: string, options?: { isActive?: boolean }) {
    return this.prisma.repository.findMany({
      where: {
        organizationId,
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single repository
   */
  async findOne(organizationId: string, id: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, organizationId },
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException(`Repository ${id} not found`);
    }

    return repository;
  }

  /**
   * Update repository settings
   */
  async update(organizationId: string, id: string, dto: UpdateRepositoryDto) {
    await this.findOne(organizationId, id);

    return this.prisma.repository.update({
      where: { id },
      data: dto,
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Bulk update repositories (enable/disable)
   */
  async bulkUpdate(organizationId: string, dto: BulkUpdateRepositoriesDto) {
    const result = await this.prisma.repository.updateMany({
      where: {
        id: { in: dto.ids },
        organizationId,
      },
      data: { isActive: dto.isActive },
    });

    return { updated: result.count };
  }

  /**
   * Delete a repository
   */
  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.repository.delete({ where: { id } });
  }

  /**
   * Sync repositories from a git provider integration
   */
  async syncFromIntegration(organizationId: string, integrationId: string) {
    // Get the integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        status: IntegrationStatus.CONNECTED,
        type: { in: [IntegrationType.GITLAB, IntegrationType.GITHUB] },
      },
    });

    if (!integration) {
      throw new NotFoundException(
        `Git integration ${integrationId} not found or not connected`,
      );
    }

    // Create adapter
    const adapter = await this.adapterFactory.createGitProviderFromIntegration(
      organizationId,
      integrationId,
    );

    // Fetch remote repositories
    this.logger.log(`Syncing repositories from ${integration.type}...`);
    const remoteRepos = await adapter.listRepositories({ limit: 100 });

    // Map provider type
    const provider = this.mapIntegrationToGitProvider(integration.type);

    // Sync to database using upsert to prevent race conditions
    // This handles concurrent syncs that might try to create the same repository
    const results = {
      synced: 0,
      total: remoteRepos.length,
    };

    for (const remote of remoteRepos) {
      try {
        // Use upsert for atomic create-or-update operation
        // This prevents TOCTOU race condition from check-then-create/update
        await this.prisma.repository.upsert({
          where: {
            organizationId_provider_externalId: {
              organizationId,
              provider,
              externalId: remote.id,
            },
          },
          update: {
            name: remote.name,
            fullPath: remote.fullName,
            description: remote.description,
            defaultBranch: remote.defaultBranch,
            cloneUrl: remote.cloneUrl,
            webUrl: remote.webUrl,
            lastSyncedAt: new Date(),
          },
          create: {
            organizationId,
            integrationId,
            provider,
            externalId: remote.id,
            name: remote.name,
            fullPath: remote.fullName,
            description: remote.description,
            defaultBranch: remote.defaultBranch,
            cloneUrl: remote.cloneUrl,
            webUrl: remote.webUrl,
            isActive: false, // Disabled by default - user must enable
            lastSyncedAt: new Date(),
          },
        });
        results.synced++;
      } catch (error) {
        this.logger.error(
          `Failed to sync repository ${remote.id}: ${(error as Error).message}`,
        );
      }
    }

    // Update integration last sync
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `Sync complete: ${results.synced} of ${results.total} repositories synced`,
    );

    return results;
  }

  /**
   * Sync all git integrations for an organization
   */
  async syncAll(organizationId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: {
        organizationId,
        status: IntegrationStatus.CONNECTED,
        type: { in: [IntegrationType.GITLAB, IntegrationType.GITHUB] },
      },
    });

    const results = {
      integrations: integrations.length,
      totalSynced: 0,
      totalRepositories: 0,
      errors: [] as string[],
    };

    for (const integration of integrations) {
      try {
        const syncResult = await this.syncFromIntegration(
          organizationId,
          integration.id,
        );
        results.totalSynced += syncResult.synced;
        results.totalRepositories += syncResult.total;
      } catch (error) {
        const message = `Failed to sync ${integration.type}: ${(error as Error).message}`;
        this.logger.error(message);
        results.errors.push(message);
      }
    }

    return results;
  }

  /**
   * Get repositories available for a project (active repos)
   */
  async getAvailableForProject(organizationId: string) {
    return this.prisma.repository.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        fullPath: true,
        provider: true,
        defaultBranch: true,
        webUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private mapIntegrationToGitProvider(type: IntegrationType): GitProvider {
    switch (type) {
      case IntegrationType.GITLAB:
        return GitProvider.GITLAB;
      case IntegrationType.GITHUB:
        return GitProvider.GITHUB;
      default:
        throw new BadRequestException(`Unsupported integration type: ${type}`);
    }
  }
}
