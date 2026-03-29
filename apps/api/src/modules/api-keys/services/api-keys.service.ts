import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateApiKeyDto } from '../dto/api-key.dto';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateApiKey(): string {
    // Generate a secure random API key: atk_<32 random bytes as hex>
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `atk_${randomBytes}`;
  }

  /**
   * Hash API key using Argon2id (recommended for API keys)
   * Argon2id is resistant to both side-channel and GPU attacks
   */
  private async hashApiKey(key: string): Promise<string> {
    return argon2.hash(key, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 threads
    });
  }

  /**
   * Verify API key against Argon2 hash
   */
  private async verifyApiKey(key: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, key);
    } catch {
      return false;
    }
  }

  /**
   * Legacy SHA256 hash for backwards compatibility during migration
   */
  private sha256Hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async create(organizationId: string, dto: CreateApiKeyDto) {
    const key = this.generateApiKey();
    const hashedKey = await this.hashApiKey(key);
    const prefix = key.substring(0, 12); // "atk_" + first 8 chars

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: dto.name,
        prefix,
        hashedKey,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Return with the full key (only time it's shown)
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key, // Full key - only returned once
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new NotFoundException(`API Key ${id} not found`);
    }

    return this.prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * Validate an API key and return the organization ID
   * Supports both legacy SHA256 and new Argon2 hashes for backwards compatibility
   */
  async validateKey(key: string): Promise<string | null> {
    // First, try to find by prefix (for faster lookup)
    const prefix = key.substring(0, 12);

    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        prefix,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (apiKeys.length === 0) {
      return null;
    }

    // Find the matching key by verifying the hash
    for (const apiKey of apiKeys) {
      let isValid = false;

      // Check if it's an Argon2 hash (starts with $argon2)
      if (apiKey.hashedKey.startsWith('$argon2')) {
        isValid = await this.verifyApiKey(key, apiKey.hashedKey);
      } else {
        // Legacy SHA256 hash
        const sha256 = this.sha256Hash(key);
        isValid = apiKey.hashedKey === sha256;

        // If valid with SHA256, migrate to Argon2
        if (isValid) {
          this.logger.log(
            `Migrating API key ${apiKey.id} from SHA256 to Argon2`,
          );
          const newHash = await this.hashApiKey(key);
          await this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { hashedKey: newHash },
          });
        }
      }

      if (isValid) {
        // Update last used timestamp
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        return apiKey.organizationId;
      }
    }

    return null;
  }
}
