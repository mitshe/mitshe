import { ExecutionContext } from '@nestjs/common';

export interface AuthResult {
  organizationId: string;
  userId: string;
  authType: 'api-key' | 'jwt';
  email?: string;
}

export interface AuthStrategy {
  canHandle(context: ExecutionContext): boolean;
  authenticate(context: ExecutionContext): Promise<AuthResult>;
}
