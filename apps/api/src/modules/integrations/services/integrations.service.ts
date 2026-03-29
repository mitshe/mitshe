import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../../../shared/encryption/encryption.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from '../dto/integration.dto';
import { IntegrationType, IntegrationStatus } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly adapterFactory: AdapterFactoryService,
  ) {}

  async create(organizationId: string, dto: CreateIntegrationDto) {
    // Encrypt configuration
    const { encrypted, iv } = this.encryption.encryptJson(dto.config);

    try {
      // Use try-catch to handle unique constraint violation
      // This prevents TOCTOU race condition from check-then-create
      return await this.prisma.integration.create({
        data: {
          organizationId,
          type: dto.type,
          status: IntegrationStatus.CONNECTED,
          config: new Uint8Array(encrypted),
          configIv: new Uint8Array(iv),
        },
        select: {
          id: true,
          organizationId: true,
          type: true,
          status: true,
          lastSyncAt: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // P2002 is Prisma's unique constraint violation code
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Integration ${dto.type} already exists for this organization`,
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.integration.findMany({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        type: true,
        status: true,
        lastSyncAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        type: true,
        status: true,
        lastSyncAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    return integration;
  }

  async update(organizationId: string, id: string, dto: UpdateIntegrationDto) {
    await this.findOne(organizationId, id);

    const data: any = {};

    if (dto.config) {
      const { encrypted, iv } = this.encryption.encryptJson(dto.config);
      data.config = encrypted;
      data.configIv = iv;
      data.status = IntegrationStatus.CONNECTED;
      data.errorMessage = null;
    }

    return this.prisma.integration.update({
      where: { id },
      data,
      select: {
        id: true,
        organizationId: true,
        type: true,
        status: true,
        lastSyncAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.integration.delete({ where: { id } });
  }

  // =========================================================================
  // Internal Methods (for adapters)
  // =========================================================================

  /**
   * Get decrypted config for an integration (internal use only)
   */
  async getDecryptedConfig<T = Record<string, unknown>>(
    organizationId: string,
    type: IntegrationType,
  ): Promise<T | null> {
    const integration = await this.prisma.integration.findFirst({
      where: { organizationId, type, status: IntegrationStatus.CONNECTED },
    });

    if (!integration) {
      return null;
    }

    return this.encryption.decryptJson<T>(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );
  }

  /**
   * Mark integration as errored
   */
  async markError(
    organizationId: string,
    type: IntegrationType,
    error: string,
  ) {
    await this.prisma.integration.updateMany({
      where: { organizationId, type },
      data: {
        status: IntegrationStatus.ERROR,
        errorMessage: error,
      },
    });
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(organizationId: string, type: IntegrationType) {
    await this.prisma.integration.updateMany({
      where: { organizationId, type },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Test connection for an integration
   */
  async testConnection(
    organizationId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    // Get decrypted config
    const config = this.encryption.decryptJson(
      Buffer.from(integration.config),
      Buffer.from(integration.configIv),
    );

    // Test using the adapter factory
    const result = await this.adapterFactory.testIntegrationConnection(
      integration.type,
      config,
    );

    // Update integration status based on test result
    await this.prisma.integration.update({
      where: { id },
      data: {
        status: result.success
          ? IntegrationStatus.CONNECTED
          : IntegrationStatus.ERROR,
        errorMessage: result.error || null,
        lastSyncAt: result.success ? new Date() : undefined,
      },
    });

    return {
      success: result.success,
      message: result.success
        ? 'Connection successful'
        : result.error || 'Connection failed',
    };
  }

  /**
   * Test connection before saving (pre-connect test)
   */
  async testBeforeConnect(
    type: IntegrationType,
    config: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.adapterFactory.testIntegrationConnection(
      type,
      config,
    );

    return {
      success: result.success,
      message: result.success
        ? 'Connection successful - ready to connect'
        : result.error || 'Connection failed',
    };
  }
}
