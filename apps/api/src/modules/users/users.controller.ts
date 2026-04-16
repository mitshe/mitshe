import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsEmail, IsString, IsOptional, MinLength, IsIn } from 'class-validator';
import { OrganizationRole } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthGuard } from '@/shared/auth/auth.guard';
import { AuthResult } from '@/shared/auth/strategies/auth-strategy.interface';
import { AuthRateLimit } from '@/shared/decorators/throttle.decorator';

interface AuthenticatedRequest extends Request {
  auth: AuthResult;
}

class RegisterRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  organizationName?: string;
}

class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

class RefreshRequestDto {
  @IsString()
  @IsOptional()
  refreshToken: string;
}

class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class SwitchOrgDto {
  @IsString()
  organizationId: string;
}

class CreateMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
  @IsOptional()
  role?: OrganizationRole;

  @IsString()
  @IsOptional()
  password?: string;
}

class UpdateMemberRoleDto {
  @IsIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
  role: OrganizationRole;
}

@Controller('auth')
@AuthRateLimit()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Check if the app has been set up (first user created).
   * Public endpoint - no auth required.
   */
  @Get('setup-status')
  async getSetupStatus() {
    const isSetUp = await this.usersService.isSetUp();
    return { isSetUp };
  }

  /**
   * Register the first user (admin).
   * Only works when no users exist yet.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.register(dto);

    // Set refresh token in httpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  /**
   * Login with email and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.login(dto);

    // Set refresh token in httpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   * Accepts refresh token from cookie or body
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens = await this.usersService.refreshTokens(refreshToken);

    // Set new refresh token in cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout - revoke refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken || dto.refreshToken;

    if (refreshToken) {
      await this.usersService.logout(refreshToken);
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user info
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.auth.userId);
  }

  /**
   * Change password
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.changePassword(
      req.auth.userId,
      dto.oldPassword,
      dto.newPassword,
    );

    // Clear refresh token cookie (force re-login)
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  /**
   * Switch to a different organization
   * Returns new tokens for the specified organization
   */
  @Post('switch-organization')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchOrganization(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SwitchOrgDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.usersService.switchOrganization(
      req.auth.userId,
      dto.organizationId,
    );

    // Set new refresh token in cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout from all devices
   */
  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.logoutAll(req.auth.userId);

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out from all devices' };
  }

  // ============================================================================
  // Team management (selfhosted)
  // ============================================================================

  @Get('team/members')
  @UseGuards(AuthGuard)
  async listMembers(@Req() req: AuthenticatedRequest) {
    const members = await this.usersService.listMembers(req.auth.organizationId);
    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  @Post('team/members')
  @UseGuards(AuthGuard)
  async createMember(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMemberDto,
  ) {
    // Only OWNER and ADMIN can add members
    const callerMembership = await this.usersService.listMembers(req.auth.organizationId);
    const caller = callerMembership.find((m) => m.user.id === req.auth.userId);
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
      throw new ForbiddenException('Only admins can add team members');
    }

    const result = await this.usersService.createMember(req.auth.organizationId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || 'MEMBER',
      password: dto.password,
    });

    return result;
  }

  @Patch('team/members/:userId/role')
  @UseGuards(AuthGuard)
  async updateMemberRole(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const callerMembership = await this.usersService.listMembers(req.auth.organizationId);
    const caller = callerMembership.find((m) => m.user.id === req.auth.userId);
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
      throw new ForbiddenException('Only admins can change roles');
    }

    await this.usersService.updateMemberRole(req.auth.organizationId, userId, dto.role);
    return { status: 'ok' };
  }

  @Delete('team/members/:userId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const callerMembership = await this.usersService.listMembers(req.auth.organizationId);
    const caller = callerMembership.find((m) => m.user.id === req.auth.userId);
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
      throw new ForbiddenException('Only admins can remove members');
    }

    await this.usersService.removeMember(req.auth.organizationId, userId);
    return { status: 'ok' };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private setRefreshTokenCookie(res: Response, token: string): void {
    // Set cookie to expire in 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}
