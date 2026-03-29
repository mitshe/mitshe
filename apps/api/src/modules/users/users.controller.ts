import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService, RegisterDto, LoginDto } from './users.service';
import { AuthGuard } from '@/shared/auth/auth.guard';
import { AuthResult } from '@/shared/auth/strategies/auth-strategy.interface';

interface AuthenticatedRequest extends Request {
  auth: AuthResult;
}

class RegisterRequestDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

class LoginRequestDto {
  email: string;
  password: string;
  organizationId?: string;
}

class RefreshRequestDto {
  refreshToken: string;
}

class ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

class SwitchOrgDto {
  organizationId: string;
}

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Register a new user
   * Creates user + default organization
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
      throw new Error('Refresh token is required');
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
