import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthStrategy } from './strategies/clerk.strategy';
import { ApiKeyAuthStrategy } from './strategies/api-key.strategy';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { AuthStrategy, AuthResult } from './strategies/auth-strategy.interface';

/**
 * Unified AuthGuard that supports multiple authentication strategies.
 *
 * Tries strategies in order:
 * 1. API Key (Bearer atk_*) - for external/programmatic access
 * 2. JWT (selfhosted auth) - for selfhosted deployments
 * 3. Clerk JWT - for SaaS/dashboard access
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly strategies: AuthStrategy[];

  constructor(
    private readonly configService: ConfigService,
    private readonly clerkStrategy: ClerkAuthStrategy,
    private readonly apiKeyStrategy: ApiKeyAuthStrategy,
    private readonly jwtStrategy: JwtAuthStrategy,
  ) {
    this.strategies = [
      this.apiKeyStrategy,
      this.jwtStrategy,
      this.clerkStrategy,
    ];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        const authResult = await strategy.authenticate(context);
        this.attachAuthToRequest(request, authResult);
        return true;
      }
    }

    throw new UnauthorizedException('Missing or invalid authorization');
  }

  private attachAuthToRequest(request: any, auth: AuthResult): void {
    request.auth = auth;
    request.organizationId = auth.organizationId;

    if (auth.clerkUser) {
      request.clerkUser = auth.clerkUser;
    }

    this.logger.debug(
      `Authenticated via ${auth.authType} for org: ${auth.organizationId}`,
    );
  }
}
