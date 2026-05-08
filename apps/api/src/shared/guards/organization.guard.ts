import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.auth?.organizationId) {
      throw new BadRequestException(
        'Organization not found. Make sure AuthGuard is applied.',
      );
    }

    request.organizationId = request.auth.organizationId;

    return true;
  }
}
