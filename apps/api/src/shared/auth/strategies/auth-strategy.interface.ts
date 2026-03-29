import { ExecutionContext } from '@nestjs/common';

export interface AuthResult {
  /** Internal organization ID from database */
  organizationId: string;
  /** User ID (Clerk userId, internal user ID, or 'api' for API key auth) */
  userId: string;
  /** Type of authentication used */
  authType: 'clerk' | 'api-key' | 'local' | 'jwt';
  /** Original Clerk user data (only for clerk auth) */
  clerkUser?: {
    userId: string;
    organizationId: string | null;
    sessionId: string;
  };
  /** User email (for jwt/selfhosted auth) */
  email?: string;
}

export interface AuthStrategy {
  /**
   * Check if this strategy can handle the request
   * (e.g., check for specific header format)
   */
  canHandle(context: ExecutionContext): boolean;

  /**
   * Authenticate the request and return auth result
   * Throws UnauthorizedException if authentication fails
   */
  authenticate(context: ExecutionContext): Promise<AuthResult>;
}

export const AUTH_STRATEGIES = 'AUTH_STRATEGIES';
