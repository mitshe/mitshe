import {
  Injectable,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { AuthStrategy, AuthResult } from './auth-strategy.interface';

const LOCAL_ORG_CLERK_ID = 'local_default';
const LOCAL_USER_ID = 'local_anonymous';

/**
 * Local authentication strategy for anonymous/local mode.
 *
 * When AUTH_MODE=local, this strategy allows all requests without
 * any authentication. It creates/uses a default "local" organization.
 *
 * This is useful for:
 * - Local development without Clerk setup
 * - Self-hosted single-user deployments
 * - Quick demos and testing
 */
@Injectable()
export class LocalAuthStrategy implements AuthStrategy {
  private readonly logger = new Logger(LocalAuthStrategy.name);
  private readonly isLocalMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isLocalMode = this.configService.get<string>('AUTH_MODE') === 'local';

    if (this.isLocalMode) {
      this.logger.warn('Running in LOCAL mode - authentication is disabled!');
    }
  }

  canHandle(_context: ExecutionContext): boolean {
    // Only handle requests in local mode
    return this.isLocalMode;
  }

  async authenticate(_context: ExecutionContext): Promise<AuthResult> {
    // Get or create the local organization
    const organizationId = await this.getOrCreateLocalOrganization();

    return {
      organizationId,
      userId: LOCAL_USER_ID,
      authType: 'local' as any, // Extended auth type for local mode
    };
  }

  private async getOrCreateLocalOrganization(): Promise<string> {
    let org = await this.prisma.organization.findUnique({
      where: { clerkId: LOCAL_ORG_CLERK_ID },
    });

    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          clerkId: LOCAL_ORG_CLERK_ID,
          name: 'Local Workspace',
        },
      });
      this.logger.log(`Created local organization: ${org.id}`);
    }

    return org.id;
  }
}
