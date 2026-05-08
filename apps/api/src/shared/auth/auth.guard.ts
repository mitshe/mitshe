import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeyAuthStrategy } from './strategies/api-key.strategy';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { AuthStrategy, AuthResult } from './strategies/auth-strategy.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly strategies: AuthStrategy[];

  constructor(
    private readonly apiKeyStrategy: ApiKeyAuthStrategy,
    private readonly jwtStrategy: JwtAuthStrategy,
  ) {
    this.strategies = [this.apiKeyStrategy, this.jwtStrategy];
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

    this.logger.debug(
      `Authenticated via ${auth.authType} for org: ${auth.organizationId}`,
    );
  }
}
