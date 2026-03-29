import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

export interface ClerkUser {
  userId: string;
  organizationId: string | null;
  sessionId: string;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private readonly secretKey: string | undefined;
  private readonly isLocalMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isLocalMode = this.configService.get<string>('AUTH_MODE') === 'local';
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

    if (!secretKey && !this.isLocalMode) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    this.secretKey = secretKey;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // In local mode, skip Clerk authentication entirely
    if (this.isLocalMode) {
      const request = context.switchToHttp().getRequest();
      request.clerkUser = {
        userId: 'local_anonymous',
        organizationId: null,
        sessionId: 'local_session',
      } as ClerkUser;
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Verify the session token using standalone function
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
      });

      // Attach user info to request
      request.clerkUser = {
        userId: payload.sub,
        organizationId: payload.org_id || null,
        sessionId: payload.sid,
      } as ClerkUser;

      return true;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
