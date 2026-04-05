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
   * Bulk delete repositories
   */
  async bulkDelete(organizationId: string, ids: string[]) {
    const result = await this.prisma.repository.deleteMany({
      where: {
        id: { in: ids },
        organizationId,
      },
    });

    return { deleted: result.count };
  }

  /**
   * List remote repositories from all connected git integrations without importing
   */
  async listRemoteRepositories(organizationId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: {
        organizationId,
        status: IntegrationStatus.CONNECTED,
        type: { in: [IntegrationType.GITLAB, IntegrationType.GITHUB] },
      },
    });

    const existingRepos = await this.prisma.repository.findMany({
      where: { organizationId },
      select: { provider: true, externalId: true },
    });

    const existingSet = new Set(
      existingRepos.map((r) => `${r.provider}:${r.externalId}`),
    );

    const results: Array<{
      externalId: string;
      name: string;
      fullPath: string;
      description: string | null;
      defaultBranch: string;
      webUrl: string;
      provider: GitProvider;
      integrationId: string;
      alreadyImported: boolean;
    }> = [];

    for (const integration of integrations) {
      try {
        const adapter =
          await this.adapterFactory.createGitProviderFromIntegration(
            organizationId,
            integration.id,
          );
        const remoteRepos = await adapter.listRepositories({ limit: 100 });
        const provider = this.mapIntegrationToGitProvider(integration.type);

        for (const remote of remoteRepos) {
          results.push({
            externalId: remote.id,
            name: remote.name,
            fullPath: remote.fullName,
            description: remote.description ?? null,
            defaultBranch: remote.defaultBranch,
            webUrl: remote.webUrl,
            provider,
            integrationId: integration.id,
            alreadyImported: existingSet.has(`${provider}:${remote.id}`),
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to list repos from ${integration.type}: ${(error as Error).message}`,
        );
      }
    }

    return results;
  }

  /**
   * Sync repositories from a git provider integration
   */
  async syncFromIntegration(
    organizationId: string,
    integrationId: string,
    externalIds?: string[],
  ) {
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
    const allRemoteRepos = await adapter.listRepositories({ limit: 100 });

    // Filter by external IDs if provided
    const remoteRepos = externalIds
      ? allRemoteRepos.filter((r) => externalIds.includes(r.id))
      : allRemoteRepos;

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
   * Sync all git integrations for an organization (imports new repos via upsert)
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
   * Sync only already-imported repositories (update metadata, no new imports)
   */
  async syncExisting(organizationId: string) {
    const existingRepos = await this.prisma.repository.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        externalId: true,
        integrationId: true,
      },
    });

    if (existingRepos.length === 0) {
      return { synced: 0, total: 0 };
    }

    // Group by integrationId
    const byIntegration = new Map<
      string,
      Array<{ id: string; externalId: string }>
    >();
    for (const repo of existingRepos) {
      const list = byIntegration.get(repo.integrationId) || [];
      list.push({ id: repo.id, externalId: repo.externalId });
      byIntegration.set(repo.integrationId, list);
    }

    const results = { synced: 0, total: existingRepos.length };

    for (const [integrationId, repos] of byIntegration) {
      try {
        const adapter =
          await this.adapterFactory.createGitProviderFromIntegration(
            organizationId,
            integrationId,
          );
        const remoteRepos = await adapter.listRepositories({ limit: 100 });
        const remoteMap = new Map(remoteRepos.map((r) => [r.id, r]));

        for (const repo of repos) {
          const remote = remoteMap.get(repo.externalId);
          if (!remote) continue;

          try {
            await this.prisma.repository.update({
              where: { id: repo.id },
              data: {
                name: remote.name,
                fullPath: remote.fullName,
                description: remote.description,
                defaultBranch: remote.defaultBranch,
                cloneUrl: remote.cloneUrl,
                webUrl: remote.webUrl,
                lastSyncedAt: new Date(),
              },
            });
            results.synced++;
          } catch (error) {
            this.logger.error(
              `Failed to update repository ${repo.id}: ${(error as Error).message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to sync from integration ${integrationId}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Sync existing complete: ${results.synced} of ${results.total} repositories updated`,
    );

    return results;
  }

  /**
   * Sync a single already-imported repository
   */
  async syncOne(organizationId: string, id: string) {
    const repo = await this.findOne(organizationId, id);

    const adapter = await this.adapterFactory.createGitProviderFromIntegration(
      organizationId,
      repo.integrationId,
    );

    const remoteRepos = await adapter.listRepositories({ limit: 100 });
    const remote = remoteRepos.find((r) => r.id === repo.externalId);

    if (!remote) {
      return { synced: false, message: 'Repository not found on remote' };
    }

    await this.prisma.repository.update({
      where: { id },
      data: {
        name: remote.name,
        fullPath: remote.fullName,
        description: remote.description,
        defaultBranch: remote.defaultBranch,
        cloneUrl: remote.cloneUrl,
        webUrl: remote.webUrl,
        lastSyncedAt: new Date(),
      },
    });

    return { synced: true, message: 'Repository synced successfully' };
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
