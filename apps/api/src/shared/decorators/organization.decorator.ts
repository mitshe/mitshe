import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { AuthResult } from '../auth/strategies/auth-strategy.interface';

export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    if (request.auth?.organizationId) {
      return request.auth.organizationId;
    }

    if (request.organizationId) {
      return request.organizationId;
    }

    throw new BadRequestException(
      'Organization not found. Make sure AuthGuard is applied.',
    );
  },
);

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    if (request.auth?.userId) {
      return request.auth.userId;
    }

    throw new BadRequestException('User not authenticated');
  },
);

export const CurrentAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthResult => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.auth) {
      throw new BadRequestException('Not authenticated');
    }

    return request.auth;
  },
);
