import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '@/modules/api-keys/services/api-keys.service';
import { AuthStrategy, AuthResult } from './auth-strategy.interface';

@Injectable()
export class ApiKeyAuthStrategy implements AuthStrategy {
  private readonly logger = new Logger(ApiKeyAuthStrategy.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  canHandle(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    // API keys start with atk_
    return token.startsWith('atk_');
  }

  async authenticate(context: ExecutionContext): Promise<AuthResult> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const apiKey = authHeader.substring(7);

    try {
      const organizationId = await this.apiKeysService.validateKey(apiKey);

      if (!organizationId) {
        throw new UnauthorizedException('Invalid or expired API key');
      }

      this.logger.debug(`API key authenticated for org: ${organizationId}`);

      return {
        organizationId,
        userId: 'api', // API key auth doesn't have a specific user
        authType: 'api-key',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('API key validation failed', error);
      throw new UnauthorizedException('API key validation failed');
    }
  }
}
