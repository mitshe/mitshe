import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { EncryptionService } from '@/shared/encryption/encryption.service';
import { AIProvider, IntegrationType, IntegrationStatus } from '@prisma/client';
import { WorkflowJobPayload } from '@/infrastructure/docker/docker.service';

/**
 * CredentialsLoaderService
 *
 * Single Responsibility: Load and decrypt credentials for workflow execution
 *
 * - Load AI credentials (Claude, OpenAI, etc.)
 * - Load Git credentials (GitHub, GitLab)
 * - Load notification credentials (Slack, Discord, Telegram)
 */
@Injectable()
export class CredentialsLoaderService {
  private readonly logger = new Logger(CredentialsLoaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Load all credentials for organization
   */
  async load(
    organizationId: string,
  ): Promise<WorkflowJobPayload['credentials']> {
    const credentials: WorkflowJobPayload['credentials'] = {
      ai: {},
    };

    // Load AI credentials
    await this.loadAICredentials(organizationId, credentials);

    // Load Git credentials
    await this.loadGitCredentials(organizationId, credentials);

    // Load Slack credentials
    await this.loadSlackCredentials(organizationId, credentials);

    // Load Discord credentials
    await this.loadDiscordCredentials(organizationId, credentials);

    // Load Telegram credentials
    await this.loadTelegramCredentials(organizationId, credentials);

    return credentials;
  }

  private async loadAICredentials(
    organizationId: string,
    credentials: WorkflowJobPayload['credentials'],
  ): Promise<void> {
    const aiCredentials = await this.prisma.aICredential.findMany({
      where: { organizationId },
    });

    type AIProviderKey = Exclude<
      keyof WorkflowJobPayload['credentials']['ai'],
      'defaultProvider'
    >;

    const providerMap: Record<AIProvider, AIProviderKey> = {
      [AIProvider.CLAUDE]: 'claude',
      [AIProvider.OPENAI]: 'openai',
      [AIProvider.OPENROUTER]: 'openrouter',
      [AIProvider.GEMINI]: 'gemini',
      [AIProvider.GROQ]: 'groq',
      [AIProvider.CLAUDE_CODE_LOCAL]: 'claude',
    };

    for (const cred of aiCredentials) {
      const key = providerMap[cred.provider];
      if (key) {
        try {
          const decryptedKey = this.encryptionService.decrypt(
            Buffer.from(cred.encryptedKey),
            Buffer.from(cred.keyIv),
          );
          (credentials.ai as Record<string, string | undefined>)[key] =
            decryptedKey;

          if (cred.isDefault) {
            credentials.ai.defaultProvider = key;
          }
        } catch (error) {
          this.logger.error(
            `Failed to decrypt AI credential for provider ${cred.provider}: ${error.message}`,
          );
          // Don't throw - continue loading other credentials
        }
      }
    }

    // Set default if not already set
    if (!credentials.ai.defaultProvider) {
      const firstProvider = Object.keys(credentials.ai).find(
        (k) => k !== 'defaultProvider',
      ) as WorkflowJobPayload['credentials']['ai']['defaultProvider'];
      if (firstProvider) {
        credentials.ai.defaultProvider = firstProvider;
      }
    }
  }

  private async loadGitCredentials(
    organizationId: string,
    credentials: WorkflowJobPayload['credentials'],
  ): Promise<void> {
    const gitIntegration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: { in: [IntegrationType.GITHUB, IntegrationType.GITLAB] },
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!gitIntegration) return;

    try {
      const configJson = this.encryptionService.decrypt(
        Buffer.from(gitIntegration.config),
        Buffer.from(gitIntegration.configIv),
      );
      const config = JSON.parse(configJson) as Record<string, unknown>;

      const gitProviderMap: Record<string, 'github' | 'gitlab'> = {
        [IntegrationType.GITHUB]: 'github',
        [IntegrationType.GITLAB]: 'gitlab',
      };

      credentials.git = {
        token: config.accessToken as string,
        provider: gitProviderMap[gitIntegration.type],
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt Git credentials: ${error.message}`);
    }
  }

  private async loadSlackCredentials(
    organizationId: string,
    credentials: WorkflowJobPayload['credentials'],
  ): Promise<void> {
    const slackIntegration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: IntegrationType.SLACK,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!slackIntegration) return;

    try {
      const configJson = this.encryptionService.decrypt(
        Buffer.from(slackIntegration.config),
        Buffer.from(slackIntegration.configIv),
      );
      const config = JSON.parse(configJson) as Record<string, unknown>;

      credentials.slack = {
        botToken: config.botToken as string | undefined,
        defaultChannel: config.defaultChannel as string | undefined,
        webhookUrl: config.webhookUrl as string | undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt Slack credentials: ${error.message}`,
      );
    }
  }

  private async loadDiscordCredentials(
    organizationId: string,
    credentials: WorkflowJobPayload['credentials'],
  ): Promise<void> {
    const discordIntegration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: IntegrationType.DISCORD,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!discordIntegration) return;

    try {
      const configJson = this.encryptionService.decrypt(
        Buffer.from(discordIntegration.config),
        Buffer.from(discordIntegration.configIv),
      );
      const config = JSON.parse(configJson) as Record<string, unknown>;

      credentials.discord = {
        webhookUrl: config.webhookUrl as string,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt Discord credentials: ${error.message}`,
      );
    }
  }

  private async loadTelegramCredentials(
    organizationId: string,
    credentials: WorkflowJobPayload['credentials'],
  ): Promise<void> {
    const telegramIntegration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: IntegrationType.TELEGRAM,
        status: IntegrationStatus.CONNECTED,
      },
    });

    if (!telegramIntegration) return;

    try {
      const configJson = this.encryptionService.decrypt(
        Buffer.from(telegramIntegration.config),
        Buffer.from(telegramIntegration.configIv),
      );
      const config = JSON.parse(configJson) as Record<string, unknown>;

      credentials.telegram = {
        botToken: config.botToken as string,
        defaultChatId: config.defaultChatId as string | undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt Telegram credentials: ${error.message}`,
      );
    }
  }
}
