import {
  API_PREFIX,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
} from '@forestwatch/config';
import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  updateMeBodySchema,
  verifyEmailBodySchema,
  type LoginBody,
  type LogoutBody,
  type RefreshBody,
  type RegisterBody,
  type ForgotPasswordBody,
  type ResendVerificationBody,
  type ResetPasswordBody,
  type UpdateMeBody,
  type VerifyEmailBody,
} from '@forestwatch/validation';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { getEnv } from '../env';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { IssuedAuth, RequestUser } from './types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Register a citizen account' })
  register(@Body(new ZodValidationPipe(registerBodySchema)) body: RegisterBody) {
    return this.auth.register(body);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Sign in and issue tokens' })
  async login(
    @Body(new ZodValidationPipe(loginBodySchema)) body: LoginBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const issued = await this.auth.login(body, this.meta(request));
    return this.finishSession(response, body.clientChannel ?? 'mobile', issued);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(
    @Body(new ZodValidationPipe(refreshBodySchema)) body: RefreshBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const issued = await this.auth.refresh(body, this.peekRefresh(request, body.refreshToken), this.meta(request));
    return this.finishSession(response, body.clientChannel ?? 'mobile', issued);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  async logout(
    @Body(new ZodValidationPipe(logoutBodySchema)) body: LogoutBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logout(body, this.peekRefresh(request, body.refreshToken));
    this.clearRefreshCookie(response);
    return result;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke every refresh session for the current user' })
  async logoutAll(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.logoutAll(user);
    this.clearRefreshCookie(response);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user from the database' })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated account locale (en, si, or ta)' })
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateMeBodySchema)) body: UpdateMeBody,
  ) {
    return this.auth.updateMe(user, body);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.listSessions(user);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Confirm an email verification token' })
  verifyEmail(@Body(new ZodValidationPipe(verifyEmailBodySchema)) body: VerifyEmailBody) {
    return this.auth.verifyEmail(body);
  }

  @Post('resend-verification')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Queue another verification message when the account is unverified' })
  resendVerification(@Body(new ZodValidationPipe(resendVerificationBodySchema)) body: ResendVerificationBody) {
    return this.auth.resendVerification(body);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Queue a password reset when the account exists' })
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordBodySchema)) body: ForgotPasswordBody) {
    return this.auth.forgotPassword(body);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Set a new password from a reset token' })
  resetPassword(@Body(new ZodValidationPipe(resetPasswordBodySchema)) body: ResetPasswordBody) {
    return this.auth.resetPassword(body);
  }

  @Get('rbac-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm server-side admin RBAC' })
  rbacCheck(@CurrentUser() user: RequestUser) {
    return { ok: true as const, roles: user.roles };
  }

  private finishSession(response: Response, channel: 'web' | 'mobile', issued: IssuedAuth) {
    if (channel === 'web') {
      this.setRefreshCookie(response, issued.refreshToken);
    }
    return issued.body;
  }

  private peekRefresh(request: Request, bodyToken?: string): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return bodyToken ?? cookies?.[REFRESH_COOKIE_NAME];
  }

  private refreshCookieOptions() {
    const production = getEnv().NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: production,
      sameSite: production ? ('none' as const) : ('lax' as const),
      path: `${API_PREFIX}/auth`,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    };
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, this.refreshCookieOptions());
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.refreshCookieOptions());
  }

  private meta(request: Request) {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip ?? request.socket.remoteAddress,
    };
  }
}
