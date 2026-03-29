import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { AuthResult } from '../auth/strategies/auth-strategy.interface';

// Re-export ClerkUser type for backward compatibility
export interface ClerkUser {
  userId: string;
  organizationId: string | null;
  sessionId: string;
}

/**
 * Extracts the internal organization ID from the request.
 * Works with both AuthGuard (new) and OrganizationGuard (legacy).
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // New auth system
    if (request.auth?.organizationId) {
      return request.auth.organizationId;
    }

    // Legacy: OrganizationGuard sets this directly
    if (request.organizationId) {
      return request.organizationId;
    }

    throw new BadRequestException(
      'Organization not found. Make sure AuthGuard is applied.',
    );
  },
);

/**
 * Extracts the user ID from the request.
 * Returns Clerk userId for dashboard requests, 'api' for API key requests.
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // New auth system
    if (request.auth?.userId) {
      return request.auth.userId;
    }

    // Legacy: ClerkAuthGuard sets this
    if (request.clerkUser?.userId) {
      return request.clerkUser.userId;
    }

    throw new BadRequestException('User not authenticated');
  },
);

/**
 * Extracts the full auth result from the request.
 */
export const CurrentAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthResult => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.auth) {
      throw new BadRequestException('Not authenticated');
    }

    return request.auth;
  },
);

/**
 * Extracts the full Clerk user from the request.
 * Only available for Clerk-authenticated requests.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClerkUser => {
    const request = ctx.switchToHttp().getRequest();

    // New auth system
    if (request.auth?.clerkUser) {
      return request.auth.clerkUser;
    }

    // Legacy
    if (request.clerkUser) {
      return request.clerkUser;
    }

    throw new BadRequestException(
      'Clerk user not available. This endpoint may have been accessed via API key.',
    );
  },
);
