import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { OrganizationRole } from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  organizationId?: string; // Optional: specify which org to log into
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  organizations: {
    id: string;
    name: string;
    role: OrganizationRole;
  }[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly bcryptRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is required. Generate with: openssl rand -hex 32',
      );
    }
    this.jwtSecret = secret;
    this.accessTokenExpiry =
      this.configService.get<string>('JWT_EXPIRY') || '15m';
    this.refreshTokenExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';
  }

  /**
   * Check if the app has been set up (at least one user exists).
   */
  async isSetUp(): Promise<boolean> {
    const count = await this.prisma.user.count();
    return count > 0;
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ user: UserInfo; tokens: AuthTokens }> {
    // Only the first user can register (Jenkins-style setup)
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      throw new BadRequestException(
        'Registration is closed. The admin account has already been created.',
      );
    }

    // Validate email format
    if (!this.isValidEmail(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password strength
    if (!this.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters with at least one number and one letter',
      );
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Create user and default organization in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
        },
      });

      // Create default organization
      const orgName =
        dto.organizationName || `${dto.firstName || 'My'}'s Workspace`;
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: this.generateSlug(orgName),
          ownerId: user.id,
        },
      });

      // Add user as owner of organization
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, organization };
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.organization.id,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        imageUrl: result.user.imageUrl,
        organizations: [
          {
            id: result.organization.id,
            name: result.organization.name,
            role: 'OWNER',
          },
        ],
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: UserInfo; tokens: AuthTokens }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Determine which organization to use
    let organizationId: string;

    if (dto.organizationId) {
      // User specified an org - verify they're a member
      const membership = user.memberships.find(
        (m) => m.organizationId === dto.organizationId,
      );
      if (!membership) {
        throw new UnauthorizedException(
          'You are not a member of this organization',
        );
      }
      organizationId = dto.organizationId;
    } else if (user.memberships.length === 1) {
      // Only one org - use it
      organizationId = user.memberships[0].organizationId;
    } else if (user.memberships.length > 1) {
      // Multiple orgs - use the first one (user can switch later)
      // Prefer owned orgs first
      const ownedOrg = user.memberships.find((m) => m.role === 'OWNER');
      organizationId = ownedOrg
        ? ownedOrg.organizationId
        : user.memberships[0].organizationId;
    } else {
      throw new UnauthorizedException('User has no organizations');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      organizationId,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        organizations: user.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        })),
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Hash the refresh token to find it
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Get the user's first organization for token
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: storedToken.userId },
    });

    if (!membership) {
      throw new UnauthorizedException('User has no organizations');
    }

    // Revoke the old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      membership.organizationId,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    if (!this.isStrongPassword(newPassword)) {
      throw new BadRequestException(
        'Password must be at least 8 characters with at least one number and one letter',
      );
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens (force re-login)
    await this.logoutAll(userId);
  }

  async switchOrganization(
    userId: string,
    organizationId: string,
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify user is member of the organization
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'You are not a member of this organization',
      );
    }

    // Generate new tokens with the new organization
    return this.generateTokens(user.id, user.email, organizationId);
  }

  async getMe(userId: string): Promise<UserInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
  ): Promise<AuthTokens> {
    // Calculate expiry in seconds
    const expiresInSeconds = this.parseExpirySeconds(this.accessTokenExpiry);

    // Generate access token
    const accessToken = jwt.sign(
      {
        sub: userId,
        email,
        orgId: organizationId,
        type: 'access',
      },
      this.jwtSecret,
      { expiresIn: expiresInSeconds },
    );

    // Generate refresh token (random string)
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenValue);

    // Parse expiry to calculate date
    const expiresAt = this.parseExpiry(this.refreshTokenExpiry);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: expiresInSeconds,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  private parseExpirySeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * multipliers[unit];
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isStrongPassword(password: string): boolean {
    // At least 8 characters, at least one letter and one number
    return (
      password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
    );
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);

    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }
}
