import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { randomBytes } from 'crypto';

export type WebhookProvider = 'jira' | 'gitlab' | 'github' | 'trello';

@Injectable()
export class WebhookSecretsService {
  private readonly logger = new Logger(WebhookSecretsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Generate a new webhook secret for an organization
   * Returns the plaintext secret (only shown once)
   */
  async generateSecret(
    organizationId: string,
    provider: WebhookProvider,
  ): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    // Generate a secure random secret (32 bytes = 64 hex chars)
    const secret = randomBytes(32).toString('hex');

    // Encrypt the secret
    const { encrypted, iv } = this.encryption.encrypt(secret);

    // Store encrypted secret based on provider
    const updateData = this.buildUpdateData(provider, encrypted, iv);
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    this.logger.log(
      `Generated new ${provider} webhook secret for organization ${organizationId}`,
    );

    return secret;
  }

  /**
   * Get the decrypted webhook secret for an organization
   * Returns null if no secret is configured
   */
  async getSecret(
    organizationId: string,
    provider: WebhookProvider,
  ): Promise<string | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        jiraWebhookSecret: true,
        jiraWebhookSecretIv: true,
        gitlabWebhookSecret: true,
        gitlabWebhookSecretIv: true,
        githubWebhookSecret: true,
        githubWebhookSecretIv: true,
        trelloWebhookSecret: true,
        trelloWebhookSecretIv: true,
      },
    });

    if (!organization) {
      return null;
    }

    const { encrypted, iv } = this.extractSecretFields(organization, provider);

    if (!encrypted || !iv) {
      return null;
    }

    try {
      return this.encryption.decrypt(encrypted, iv);
    } catch (error) {
      this.logger.error(
        `Failed to decrypt ${provider} webhook secret for org ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if an organization has a webhook secret configured
   */
  async hasSecret(
    organizationId: string,
    provider: WebhookProvider,
  ): Promise<boolean> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        jiraWebhookSecret: true,
        gitlabWebhookSecret: true,
        githubWebhookSecret: true,
        trelloWebhookSecret: true,
      },
    });

    if (!organization) {
      return false;
    }

    switch (provider) {
      case 'jira':
        return !!organization.jiraWebhookSecret;
      case 'gitlab':
        return !!organization.gitlabWebhookSecret;
      case 'github':
        return !!organization.githubWebhookSecret;
      case 'trello':
        return !!organization.trelloWebhookSecret;
    }
  }

  /**
   * Delete webhook secret for an organization
   */
  async deleteSecret(
    organizationId: string,
    provider: WebhookProvider,
  ): Promise<void> {
    const updateData = this.buildUpdateData(provider, null, null);
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    this.logger.log(
      `Deleted ${provider} webhook secret for organization ${organizationId}`,
    );
  }

  /**
   * Get organization with webhook secret by token/slug
   * Used by webhook controllers for signature verification
   */
  async getOrganizationWithSecret(
    token: string,
    provider: WebhookProvider,
  ): Promise<{ organizationId: string; secret: string | null } | null> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        OR: [{ webhookToken: token }, { slug: token }],
      },
      select: {
        id: true,
        jiraWebhookSecret: true,
        jiraWebhookSecretIv: true,
        gitlabWebhookSecret: true,
        gitlabWebhookSecretIv: true,
        githubWebhookSecret: true,
        githubWebhookSecretIv: true,
        trelloWebhookSecret: true,
        trelloWebhookSecretIv: true,
      },
    });

    if (!organization) {
      return null;
    }

    const { encrypted, iv } = this.extractSecretFields(organization, provider);

    let secret: string | null = null;
    if (encrypted && iv) {
      try {
        secret = this.encryption.decrypt(encrypted, iv);
      } catch (error) {
        this.logger.error(
          `Failed to decrypt ${provider} webhook secret:`,
          error,
        );
      }
    }

    return {
      organizationId: organization.id,
      secret,
    };
  }

  /**
   * Build update data object for a specific provider
   */
  private buildUpdateData(
    provider: WebhookProvider,
    encrypted: Buffer | null,
    iv: Buffer | null,
  ): Record<string, Buffer | null> {
    switch (provider) {
      case 'jira':
        return { jiraWebhookSecret: encrypted, jiraWebhookSecretIv: iv };
      case 'gitlab':
        return { gitlabWebhookSecret: encrypted, gitlabWebhookSecretIv: iv };
      case 'github':
        return { githubWebhookSecret: encrypted, githubWebhookSecretIv: iv };
      case 'trello':
        return { trelloWebhookSecret: encrypted, trelloWebhookSecretIv: iv };
    }
  }

  /**
   * Extract encrypted secret fields for a specific provider
   * Converts Uint8Array (Prisma Bytes type) to Buffer for decryption
   */
  private extractSecretFields(
    org: {
      jiraWebhookSecret: Uint8Array | null;
      jiraWebhookSecretIv: Uint8Array | null;
      gitlabWebhookSecret: Uint8Array | null;
      gitlabWebhookSecretIv: Uint8Array | null;
      githubWebhookSecret: Uint8Array | null;
      githubWebhookSecretIv: Uint8Array | null;
      trelloWebhookSecret: Uint8Array | null;
      trelloWebhookSecretIv: Uint8Array | null;
    },
    provider: WebhookProvider,
  ): { encrypted: Buffer | null; iv: Buffer | null } {
    let encryptedArr: Uint8Array | null;
    let ivArr: Uint8Array | null;

    switch (provider) {
      case 'jira':
        encryptedArr = org.jiraWebhookSecret;
        ivArr = org.jiraWebhookSecretIv;
        break;
      case 'gitlab':
        encryptedArr = org.gitlabWebhookSecret;
        ivArr = org.gitlabWebhookSecretIv;
        break;
      case 'github':
        encryptedArr = org.githubWebhookSecret;
        ivArr = org.githubWebhookSecretIv;
        break;
      case 'trello':
        encryptedArr = org.trelloWebhookSecret;
        ivArr = org.trelloWebhookSecretIv;
        break;
    }

    return {
      encrypted: encryptedArr ? Buffer.from(encryptedArr) : null,
      iv: ivArr ? Buffer.from(ivArr) : null,
    };
  }
}
