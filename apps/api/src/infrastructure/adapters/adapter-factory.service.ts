import { Injectable, Logger } from '@nestjs/common';
import { IntegrationType, IntegrationStatus, AIProvider } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { IssueTrackerPort } from '../../ports/issue-tracker.port';
import { GitProviderPort } from '../../ports/git-provider.port';
import { NotificationPort } from '../../ports/notification.port';
import { AIProviderPort } from '../../ports/ai-provider.port';
import { KnowledgeBasePort } from '../../ports/knowledge-base.port';

// Import registrations to ensure adapters are registered
import './registrations';

import {
  AdapterConfig,
  issueTrackerRegistry,
  gitProviderRegistry,
  notificationRegistry,
  aiProviderRegistry,
  knowledgeBaseRegistry,
  isIssueTrackerType,
  isGitProviderType,
  isNotificationType,
  isKnowledgeBaseType,
  ISSUE_TRACKER_TYPES,
  GIT_PROVIDER_TYPES,
  NOTIFICATION_TYPES,
} from './adapter-registry';

export { AdapterConfig } from './adapter-registry';

@Injectable()
export class AdapterFactoryService {
  private readonly logger = new Logger(AdapterFactoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create an issue tracker adapter from an integration ID
   */
  async createIssueTrackerFromIntegration(
    organizationId: string,
    integrationId: string,
  ): Promise<IssueTrackerPort> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!integration) {
      throw new Error(
        `Integration ${integrationId} not found or not connected`,
      );
    }

    const decryptedConfig = this.encryptionService.decryptJson<AdapterConfig>(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );

    return this.createIssueTracker(integration.type, decryptedConfig);
  }

  /**
   * Create an issue tracker adapter from config
   */
  createIssueTracker(
    type: IntegrationType | string,
    config: AdapterConfig,
  ): IssueTrackerPort {
    return issueTrackerRegistry.create(String(type), config);
  }

  /**
   * Find the default issue tracker for an organization
   */
  async getDefaultIssueTracker(
    organizationId: string,
  ): Promise<IssueTrackerPort | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: {
          in: [
            IntegrationType.JIRA,
            IntegrationType.YOUTRACK,
            IntegrationType.LINEAR,
          ],
        },
        status: IntegrationStatus.CONNECTED,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!integration) {
      return null;
    }

    return this.createIssueTrackerFromIntegration(
      organizationId,
      integration.id,
    );
  }

  /**
   * Test connection for an integration
   */
  async testIntegrationConnection(
    type: IntegrationType | string,
    config: AdapterConfig,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const typeStr = String(type).toUpperCase();

      if (isIssueTrackerType(typeStr)) {
        const adapter = this.createIssueTracker(type, config);
        return await adapter.testConnection();
      }

      if (isGitProviderType(typeStr)) {
        const adapter = this.createGitProvider(type, config);
        return await adapter.testConnection();
      }

      if (isNotificationType(typeStr)) {
        const adapter = this.createNotificationProvider(type, config);
        return await adapter.testConnection();
      }

      if (isKnowledgeBaseType(typeStr)) {
        const adapter = this.createKnowledgeBase(type, config);
        return await adapter.testConnection();
      }

      return { success: false, error: `Unknown integration type: ${type}` };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========== Git Provider Methods ==========

  /**
   * Create a git provider adapter from an integration ID
   */
  async createGitProviderFromIntegration(
    organizationId: string,
    integrationId: string,
  ): Promise<GitProviderPort> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!integration) {
      throw new Error(
        `Integration ${integrationId} not found or not connected`,
      );
    }

    const decryptedConfig = this.encryptionService.decryptJson<AdapterConfig>(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );

    return this.createGitProvider(integration.type, decryptedConfig);
  }

  /**
   * Create a git provider adapter from config
   */
  createGitProvider(
    type: IntegrationType | string,
    config: AdapterConfig,
  ): GitProviderPort {
    return gitProviderRegistry.create(String(type), config);
  }

  /**
   * Find the default git provider for an organization
   */
  async getDefaultGitProvider(
    organizationId: string,
  ): Promise<GitProviderPort | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: { in: [IntegrationType.GITLAB, IntegrationType.GITHUB] },
        status: IntegrationStatus.CONNECTED,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!integration) {
      return null;
    }

    return this.createGitProviderFromIntegration(
      organizationId,
      integration.id,
    );
  }

  // ========== Notification Provider Methods ==========

  /**
   * Create a notification provider from an integration ID
   */
  async createNotificationProviderFromIntegration(
    organizationId: string,
    integrationId: string,
  ): Promise<NotificationPort> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!integration) {
      throw new Error(
        `Integration ${integrationId} not found or not connected`,
      );
    }

    const decryptedConfig = this.encryptionService.decryptJson<AdapterConfig>(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );

    return this.createNotificationProvider(integration.type, decryptedConfig);
  }

  /**
   * Create a notification provider from config
   */
  createNotificationProvider(
    type: IntegrationType | string,
    config: AdapterConfig,
  ): NotificationPort {
    return notificationRegistry.create(String(type), config);
  }

  /**
   * Find the default notification provider for an organization
   */
  async getDefaultNotificationProvider(
    organizationId: string,
  ): Promise<NotificationPort | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: {
          in: [
            IntegrationType.SLACK,
            IntegrationType.DISCORD,
            IntegrationType.TELEGRAM,
            IntegrationType.TEAMS,
          ],
        },
        status: IntegrationStatus.CONNECTED,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!integration) {
      return null;
    }

    return this.createNotificationProviderFromIntegration(
      organizationId,
      integration.id,
    );
  }

  /**
   * Get all notification providers for an organization
   */
  async getAllNotificationProviders(
    organizationId: string,
  ): Promise<NotificationPort[]> {
    const integrations = await this.prisma.integration.findMany({
      where: {
        organizationId,
        type: {
          in: [
            IntegrationType.SLACK,
            IntegrationType.DISCORD,
            IntegrationType.TELEGRAM,
            IntegrationType.TEAMS,
          ],
        },
        status: IntegrationStatus.CONNECTED,
      },
    });

    const providers: NotificationPort[] = [];

    for (const integration of integrations) {
      try {
        const provider = await this.createNotificationProviderFromIntegration(
          organizationId,
          integration.id,
        );
        providers.push(provider);
      } catch (error) {
        this.logger.warn(
          `Failed to create notification provider for ${integration.id}: ${(error as Error).message}`,
        );
      }
    }

    return providers;
  }

  // ========== Knowledge Base Provider Methods ==========

  /**
   * Create a knowledge base provider from an integration ID
   */
  async createKnowledgeBaseFromIntegration(
    organizationId: string,
    integrationId: string,
  ): Promise<KnowledgeBasePort> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!integration) {
      throw new Error(
        `Integration ${integrationId} not found or not connected`,
      );
    }

    const decryptedConfig = this.encryptionService.decryptJson<AdapterConfig>(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );

    return this.createKnowledgeBase(integration.type, decryptedConfig);
  }

  /**
   * Create a knowledge base provider from config
   */
  createKnowledgeBase(
    type: IntegrationType | string,
    config: AdapterConfig,
  ): KnowledgeBasePort {
    return knowledgeBaseRegistry.create(String(type), config);
  }

  /**
   * Find the default knowledge base for an organization
   */
  async getDefaultKnowledgeBase(
    organizationId: string,
  ): Promise<KnowledgeBasePort | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: IntegrationType.OBSIDIAN,
        status: IntegrationStatus.CONNECTED,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!integration) {
      return null;
    }

    return this.createKnowledgeBaseFromIntegration(
      organizationId,
      integration.id,
    );
  }

  // ========== AI Provider Methods ==========

  /**
   * Create an AI provider from an AI credential ID
   */
  async createAIProviderFromCredential(
    organizationId: string,
    credentialId: string,
  ): Promise<AIProviderPort> {
    const credential = await this.prisma.aICredential.findFirst({
      where: {
        id: credentialId,
        organizationId,
      },
    });

    if (!credential) {
      throw new Error(`AI Credential ${credentialId} not found`);
    }

    const apiKey = this.encryptionService.decrypt(
      Buffer.from(credential.encryptedKey),
      Buffer.from(credential.keyIv),
    );

    return this.createAIProvider(credential.provider, { apiKey });
  }

  /**
   * Create an AI provider from config
   */
  createAIProvider(
    type: AIProvider | string,
    config: {
      apiKey: string;
      defaultModel?: string;
      baseUrl?: string;
      organization?: string;
    },
  ): AIProviderPort {
    return aiProviderRegistry.create(String(type), config);
  }

  /**
   * Find the default AI provider for an organization
   */
  async getDefaultAIProvider(
    organizationId: string,
  ): Promise<AIProviderPort | null> {
    const credential = await this.prisma.aICredential.findFirst({
      where: {
        organizationId,
        isDefault: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!credential) {
      const firstCredential = await this.prisma.aICredential.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });

      if (!firstCredential) {
        return null;
      }

      return this.createAIProviderFromCredential(
        organizationId,
        firstCredential.id,
      );
    }

    return this.createAIProviderFromCredential(organizationId, credential.id);
  }

  /**
   * Get AI provider by provider type for an organization
   */
  async getAIProviderByType(
    organizationId: string,
    providerType: AIProvider,
  ): Promise<AIProviderPort | null> {
    const credential = await this.prisma.aICredential.findFirst({
      where: {
        organizationId,
        provider: providerType,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!credential) {
      return null;
    }

    return this.createAIProviderFromCredential(organizationId, credential.id);
  }

  /**
   * Get all AI providers for an organization
   */
  async getAllAIProviders(organizationId: string): Promise<AIProviderPort[]> {
    const credentials = await this.prisma.aICredential.findMany({
      where: {
        organizationId,
      },
    });

    const providers: AIProviderPort[] = [];

    for (const credential of credentials) {
      try {
        const provider = await this.createAIProviderFromCredential(
          organizationId,
          credential.id,
        );
        providers.push(provider);
      } catch (error) {
        this.logger.warn(
          `Failed to create AI provider for ${credential.id}: ${(error as Error).message}`,
        );
      }
    }

    return providers;
  }

  /**
   * Test AI provider connection
   */
  async testAIProviderConnection(
    type: AIProvider | string,
    config: {
      apiKey: string;
      defaultModel?: string;
      baseUrl?: string;
      organization?: string;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = this.createAIProvider(type, config);
      return await provider.testConnection();
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========== Registry Info Methods ==========

  /**
   * Get available issue tracker types
   */
  getAvailableIssueTrackerTypes(): string[] {
    return issueTrackerRegistry.getAvailableTypes();
  }

  /**
   * Get available git provider types
   */
  getAvailableGitProviderTypes(): string[] {
    return gitProviderRegistry.getAvailableTypes();
  }

  /**
   * Get available notification provider types
   */
  getAvailableNotificationTypes(): string[] {
    return notificationRegistry.getAvailableTypes();
  }

  /**
   * Get available AI provider types
   */
  getAvailableAIProviderTypes(): string[] {
    return aiProviderRegistry.getAvailableTypes();
  }

  /**
   * Get available knowledge base types
   */
  getAvailableKnowledgeBaseTypes(): string[] {
    return knowledgeBaseRegistry.getAvailableTypes();
  }
}
