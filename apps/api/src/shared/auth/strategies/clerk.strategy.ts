import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { AuthStrategy, AuthResult } from './auth-strategy.interface';

@Injectable()
export class ClerkAuthStrategy implements AuthStrategy {
  private readonly logger = new Logger(ClerkAuthStrategy.name);
  private readonly secretKey: string | null;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const authMode =
      this.configService.get<string>('AUTH_MODE') || 'selfhosted';
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    this.isEnabled = authMode === 'clerk' && !!secretKey;
    this.secretKey = secretKey || null;

    if (authMode === 'clerk' && !secretKey) {
      this.logger.warn('AUTH_MODE=clerk but CLERK_SECRET_KEY is not set');
    }
  }

  canHandle(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Clerk tokens are JWTs (don't start with atk_)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    // API keys start with atk_, Clerk tokens don't
    return !token.startsWith('atk_');
  }

  async authenticate(context: ExecutionContext): Promise<AuthResult> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader.substring(7);

    try {
      // Verify the Clerk JWT
      const payload = await verifyToken(token, {
        secretKey: this.secretKey!,
      });

      const clerkUser = {
        userId: payload.sub,
        organizationId: payload.org_id || null,
        sessionId: payload.sid,
      };

      // Resolve organization ID (create if needed)
      const organizationId = await this.resolveOrganization(clerkUser);

      return {
        organizationId,
        userId: clerkUser.userId,
        authType: 'clerk',
        clerkUser,
      };
    } catch (error) {
      this.logger.error('Clerk token verification failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async resolveOrganization(clerkUser: {
    userId: string;
    organizationId: string | null;
  }): Promise<string> {
    // Determine the clerk org ID (use personal_ prefix for users without org)
    const clerkOrgId =
      clerkUser.organizationId || `personal_${clerkUser.userId}`;

    // Check if organization exists in our database
    let org = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
    });

    // If not, create it
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          clerkId: clerkOrgId,
          name: clerkUser.organizationId
            ? `Organization`
            : `Personal Workspace`,
        },
      });
    }

    return org.id;
  }
}
