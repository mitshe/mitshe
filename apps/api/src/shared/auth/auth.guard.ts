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
import { LocalAuthStrategy } from './strategies/local.strategy';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { AuthStrategy, AuthResult } from './strategies/auth-strategy.interface';

/**
 * Unified AuthGuard that supports multiple authentication strategies.
 *
 * Tries strategies in order:
 * 1. Local (when AUTH_MODE=local) - no authentication required
 * 2. API Key (Bearer atk_*) - for external/programmatic access
 * 3. JWT (selfhosted auth) - for selfhosted deployments
 * 4. Clerk JWT - for SaaS/dashboard access
 *
 * On success, attaches auth result to request:
 * - request.auth: AuthResult
 * - request.organizationId: string (for backward compatibility)
 * - request.clerkUser: ClerkUser (for backward compatibility, only for Clerk auth)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly strategies: AuthStrategy[];

  constructor(
    private readonly configService: ConfigService,
    private readonly localStrategy: LocalAuthStrategy,
    private readonly clerkStrategy: ClerkAuthStrategy,
    private readonly apiKeyStrategy: ApiKeyAuthStrategy,
    private readonly jwtStrategy: JwtAuthStrategy,
  ) {
    // Order matters: Local first (if enabled), then API key, then JWT (selfhosted), then Clerk
    this.strategies = [this.localStrategy, this.apiKeyStrategy, this.jwtStrategy, this.clerkStrategy];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try each strategy in order
    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        const authResult = await strategy.authenticate(context);
        this.attachAuthToRequest(request, authResult);
        return true;
      }
    }

    // No strategy could handle the request
    throw new UnauthorizedException('Missing or invalid authorization');
  }

  private attachAuthToRequest(request: any, auth: AuthResult): void {
    // New unified auth object
    request.auth = auth;

    // Backward compatibility
    request.organizationId = auth.organizationId;

    if (auth.clerkUser) {
      request.clerkUser = auth.clerkUser;
    }

    this.logger.debug(
      `Authenticated via ${auth.authType} for org: ${auth.organizationId}`,
    );
  }
}
