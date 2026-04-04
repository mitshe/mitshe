import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { EncryptionService } from '../../../shared/encryption/encryption.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import {
  CreateAICredentialDto,
  UpdateAICredentialDto,
} from '../dto/ai-credential.dto';
import { AIProvider, Prisma } from '@prisma/client';

@Injectable()
export class AICredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly adapterFactory: AdapterFactoryService,
  ) {}

  async create(organizationId: string, dto: CreateAICredentialDto) {
    // Encrypt API key
    const { encrypted, iv } = this.encryption.encrypt(dto.apiKey);

    try {
      // Use transaction to atomically handle isDefault flag
      // This prevents race conditions when multiple credentials are created
      const credential = await this.prisma.$transaction(async (tx) => {
        // If this is set as default, unset other defaults atomically
        if (dto.isDefault) {
          await tx.aICredential.updateMany({
            where: { organizationId },
            data: { isDefault: false },
          });
        }

        return tx.aICredential.create({
          data: {
            organizationId,
            provider: dto.provider,
            encryptedKey: new Uint8Array(encrypted),
            keyIv: new Uint8Array(iv),
            isDefault: dto.isDefault ?? false,
          },
        });
      });

      return this.toResponse(credential, dto.apiKey);
    } catch (error) {
      // P2002 is Prisma's unique constraint violation code
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `AI credential for ${dto.provider} already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    const credentials = await this.prisma.aICredential.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((c) => this.toResponse(c));
  }

  async findOne(organizationId: string, id: string) {
    const credential = await this.prisma.aICredential.findFirst({
      where: { id, organizationId },
    });

    if (!credential) {
      throw new NotFoundException(`AI credential ${id} not found`);
    }

    return this.toResponse(credential);
  }

  async update(organizationId: string, id: string, dto: UpdateAICredentialDto) {
    // Prepare update data
    const data: any = {};

    if (dto.apiKey) {
      const { encrypted, iv } = this.encryption.encrypt(dto.apiKey);
      data.encryptedKey = encrypted;
      data.keyIv = iv;
    }

    if (dto.isDefault !== undefined) {
      data.isDefault = dto.isDefault;
    }

    // Use transaction to atomically handle isDefault flag changes
    // This prevents race conditions when multiple updates set isDefault
    const updated = await this.prisma.$transaction(async (tx) => {
      const credential = await tx.aICredential.findFirst({
        where: { id, organizationId },
      });

      if (!credential) {
        throw new NotFoundException(`AI credential ${id} not found`);
      }

      // If setting this as default, unset other defaults atomically
      if (dto.isDefault === true) {
        await tx.aICredential.updateMany({
          where: { organizationId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.aICredential.update({
        where: { id },
        data,
      });
    });

    return this.toResponse(updated, dto.apiKey);
  }

  async remove(organizationId: string, id: string) {
    const credential = await this.prisma.aICredential.findFirst({
      where: { id, organizationId },
    });

    if (!credential) {
      throw new NotFoundException(`AI credential ${id} not found`);
    }

    return this.prisma.aICredential.delete({ where: { id } });
  }

  // =========================================================================
  // Connection Testing
  // =========================================================================

  async testConnection(
    organizationId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const credential = await this.prisma.aICredential.findFirst({
      where: { id, organizationId },
    });

    if (!credential) {
      throw new NotFoundException(`AI credential ${id} not found`);
    }

    const apiKey = this.encryption.decrypt(
      Buffer.from(credential.encryptedKey),
      Buffer.from(credential.keyIv),
    );

    const result = await this.adapterFactory.testAIProviderConnection(
      credential.provider,
      { apiKey },
    );

    return {
      success: result.success,
      message: result.success
        ? 'Connection successful'
        : result.error || 'Connection failed',
    };
  }

  async testBeforeConnect(
    provider: AIProvider,
    apiKey?: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.adapterFactory.testAIProviderConnection(provider, {
      apiKey: apiKey || 'local',
    });

    return {
      success: result.success,
      message: result.success
        ? 'Connection successful'
        : result.error || 'Connection failed',
    };
  }

  // =========================================================================
  // Internal Methods (for AI adapters)
  // =========================================================================

  /**
   * Get decrypted API key for a provider (internal use only)
   */
  async getApiKey(
    organizationId: string,
    provider: AIProvider,
  ): Promise<string | null> {
    const credential = await this.prisma.aICredential.findFirst({
      where: { organizationId, provider },
    });

    if (!credential) {
      return null;
    }

    // Update usage stats
    await this.prisma.aICredential.update({
      where: { id: credential.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    return this.encryption.decrypt(
      Buffer.from(credential.encryptedKey),
      Buffer.from(credential.keyIv),
    );
  }

  /**
   * Get default AI provider's API key
   */
  async getDefaultApiKey(organizationId: string): Promise<{
    provider: AIProvider;
    apiKey: string;
  } | null> {
    const credential = await this.prisma.aICredential.findFirst({
      where: { organizationId, isDefault: true },
    });

    if (!credential) {
      // Fall back to first available
      const firstCredential = await this.prisma.aICredential.findFirst({
        where: { organizationId },
      });

      if (!firstCredential) {
        return null;
      }

      const apiKey = this.encryption.decrypt(
        Buffer.from(firstCredential.encryptedKey),
        Buffer.from(firstCredential.keyIv),
      );

      return { provider: firstCredential.provider, apiKey };
    }

    // Update usage stats
    await this.prisma.aICredential.update({
      where: { id: credential.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    const apiKey = this.encryption.decrypt(
      Buffer.from(credential.encryptedKey),
      Buffer.from(credential.keyIv),
    );

    return { provider: credential.provider, apiKey };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private toResponse(credential: any, originalKey?: string) {
    const maskedKey = originalKey
      ? this.maskApiKey(originalKey)
      : this.maskApiKey(
          this.encryption.decrypt(
            Buffer.from(credential.encryptedKey),
            Buffer.from(credential.keyIv),
          ),
        );

    return {
      id: credential.id,
      organizationId: credential.organizationId,
      provider: credential.provider,
      isDefault: credential.isDefault,
      lastUsedAt: credential.lastUsedAt,
      usageCount: credential.usageCount,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      maskedKey,
    };
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) {
      return '****';
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }
}
