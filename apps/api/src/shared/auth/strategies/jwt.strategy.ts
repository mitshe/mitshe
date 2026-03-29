import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { AuthStrategy, AuthResult } from './auth-strategy.interface';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  orgId: string; // organizationId
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthStrategy implements AuthStrategy {
  private readonly logger = new Logger(JwtAuthStrategy.name);
  private readonly jwtSecret: string;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // JWT auth is enabled when AUTH_MODE is 'selfhosted' or when JWT_SECRET is set
    const authMode = this.configService.get<string>('AUTH_MODE');
    this.isEnabled = authMode === 'selfhosted' || !!this.configService.get<string>('JWT_SECRET');

    const secret = this.configService.get<string>('JWT_SECRET');
    if (this.isEnabled && !secret) {
      throw new Error('JWT_SECRET is required for selfhosted auth mode');
    }
    this.jwtSecret = secret || 'not-used';
  }

  canHandle(context: ExecutionContext): boolean {
    if (!this.isEnabled) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);

    // API keys start with atk_, skip those
    if (token.startsWith('atk_')) {
      return false;
    }

    // Try to decode without verification to check if it's our JWT format
    try {
      const decoded = jwt.decode(token) as JwtPayload | null;
      // Our JWTs have 'type' field ('access' or 'refresh')
      return decoded !== null && 'type' in decoded && decoded.type === 'access';
    } catch {
      return false;
    }
  }

  async authenticate(context: ExecutionContext): Promise<AuthResult> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Verify organization exists
      const org = await this.prisma.organization.findUnique({
        where: { id: payload.orgId },
      });

      if (!org) {
        throw new UnauthorizedException('Organization not found');
      }

      // Verify user is member of organization
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: payload.orgId,
            userId: payload.sub,
          },
        },
      });

      if (!membership) {
        throw new UnauthorizedException('User is not a member of this organization');
      }

      return {
        organizationId: payload.orgId,
        userId: payload.sub,
        email: payload.email,
        authType: 'jwt',
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('JWT verification failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
