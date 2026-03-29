import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '@/modules/api-keys/services/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const apiKey = authHeader.substring(7);

    // Check if it's an API key (starts with atk_)
    if (!apiKey.startsWith('atk_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    try {
      const organizationId = await this.apiKeysService.validateKey(apiKey);

      if (!organizationId) {
        throw new UnauthorizedException('Invalid or expired API key');
      }

      // Attach organization ID to request (same as OrganizationGuard does)
      request.organizationId = organizationId;

      this.logger.debug(`API key authenticated for org: ${organizationId}`);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('API key validation failed', error);
      throw new UnauthorizedException('API key validation failed');
    }
  }
}
