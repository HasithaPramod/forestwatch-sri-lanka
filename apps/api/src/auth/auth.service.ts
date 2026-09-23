import {
  ACCESS_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_SECONDS,
  PASSWORD_RESET_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '@forestwatch/config';
import { Prisma } from '@forestwatch/database';
import { generateOpaqueToken, hashToken } from '@forestwatch/auth';
import type {
  AuthSessionSummary,
  AuthenticatedRole,
  EmailVerificationQueued,
  PasswordResetQueued,
  PublicUser,
  RegisterResult,
} from '@forestwatch/types';
import { parseAppLocale } from '@forestwatch/types';
import type {
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshBody,
  RegisterBody,
  ResendVerificationBody,
  ResetPasswordBody,
  UpdateMeBody,
  VerifyEmailBody,
} from '@forestwatch/validation';
import { Injectable, Logger } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { getEnv } from '../env';
import { TokenService } from './token.service';
import type { IssuedAuth, RequestMeta, RequestUser } from './types';

const userWithRoles = {
  roles: { include: { role: true } },
} as const;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoles }>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyPasswordHash: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterBody): Promise<RegisterResult> {
    const passwordHash = await hash(input.password, { type: argon2id });

    let user: UserWithRoles;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            locale: input.locale ?? 'en',
          },
        });
        const citizen = await tx.role.upsert({
          where: { code: 'CITIZEN' },
          update: {},
          create: { code: 'CITIZEN', name: 'Citizen' },
        });
        await tx.userRole.create({
          data: { userId: created.id, roleId: citizen.id },
        });
        return tx.user.findUniqueOrThrow({
          where: { id: created.id },
          include: userWithRoles,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }

    const verificationUrl = await this.issueEmailVerification(user.id, user.email);
    await this.audit('AUTH_REGISTER', user.id, 'User', user.id);

    return {
      user: this.toPublicUser(user),
      emailVerificationRequired: true,
      ...(this.includeDevLinks() ? { verificationUrl } : {}),
    };
  }

  async login(input: LoginBody, meta: RequestMeta): Promise<IssuedAuth> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: userWithRoles,
    });

    const passwordHash = user?.passwordHash ?? (await this.dummyHash());
    const passwordOk = await verify(passwordHash, input.password).catch(() => false);

    if (!user || !passwordOk) {
      throw new ApiException(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    if (!user.emailVerifiedAt) {
      throw new ApiException(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in');
    }

    const issued = await this.issueSession(user, meta);
    await this.audit('AUTH_LOGIN', user.id, 'Session', issued.body.user.id);
    return this.channelAuth(issued, input.clientChannel ?? 'mobile');
  }

  async refresh(input: RefreshBody, rawToken: string | undefined, meta: RequestMeta): Promise<IssuedAuth> {
    const token = rawToken ?? input.refreshToken;
    if (!token) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Refresh token is required');
    }

    const tokenHash = hashToken(token, getEnv().JWT_REFRESH_SECRET);
    const existing = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: { include: userWithRoles } },
    });

    if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Refresh token is invalid or expired');
    }

    await this.prisma.session.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const issued = await this.issueSession(existing.user, meta);
    return this.channelAuth(issued, input.clientChannel ?? 'mobile');
  }

  async logout(input: LogoutBody, rawToken: string | undefined, actor?: RequestUser): Promise<{ loggedOut: true }> {
    const token = rawToken ?? input.refreshToken;
    if (token) {
      const tokenHash = hashToken(token, getEnv().JWT_REFRESH_SECRET);
      const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });
      if (session && !session.revokedAt) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        await this.audit('AUTH_LOGOUT', session.userId, 'Session', session.id);
      }
    } else if (actor) {
      await this.prisma.session.updateMany({
        where: { id: actor.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit('AUTH_LOGOUT', actor.id, 'Session', actor.sessionId);
    }

    return { loggedOut: true };
  }

  async logoutAll(actor: RequestUser): Promise<{ loggedOut: true }> {
    await this.prisma.session.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit('AUTH_LOGOUT_ALL', actor.id, 'User', actor.id);
    return { loggedOut: true };
  }

  async me(actor: RequestUser): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: userWithRoles,
    });
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Account no longer exists');
    }
    return this.toPublicUser(user);
  }

  async updateMe(actor: RequestUser, input: UpdateMeBody): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data: { locale: input.locale },
      include: userWithRoles,
    });
    await this.audit('AUTH_LOCALE_UPDATED', actor.id, 'User', actor.id);
    return this.toPublicUser(user);
  }

  async listSessions(actor: RequestUser): Promise<AuthSessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId: actor.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      current: session.id === actor.sessionId,
    }));
  }

  async verifyEmail(input: VerifyEmailBody): Promise<{ verified: true; user: PublicUser }> {
    const tokenHash = hashToken(input.token, getEnv().JWT_REFRESH_SECRET);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { include: userWithRoles } },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(400, 'TOKEN_INVALID', 'This verification link is invalid or has expired');
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
        include: userWithRoles,
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.audit('AUTH_EMAIL_VERIFIED', user.id, 'User', user.id);
    return { verified: true, user: this.toPublicUser(user) };
  }

  async resendVerification(input: ResendVerificationBody): Promise<EmailVerificationQueued> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.emailVerifiedAt) {
      return { queued: true };
    }

    const verificationUrl = await this.issueEmailVerification(user.id, user.email);
    return {
      queued: true,
      ...(this.includeDevLinks() ? { verificationUrl } : {}),
    };
  }

  async forgotPassword(input: ForgotPasswordBody): Promise<PasswordResetQueued> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      return { queued: true };
    }

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const raw = generateOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw, getEnv().JWT_REFRESH_SECRET),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
      },
    });

    const resetUrl = `${getEnv().WEB_ORIGIN}/reset-password?token=${encodeURIComponent(raw)}`;
    this.logDevLink(`Password reset for ${user.email}`, resetUrl);
    await this.audit('AUTH_PASSWORD_RESET_REQUESTED', user.id, 'User', user.id);

    return {
      queued: true,
      ...(this.includeDevLinks() ? { resetUrl } : {}),
    };
  }

  async resetPassword(input: ResetPasswordBody): Promise<{ reset: true }> {
    const tokenHash = hashToken(input.token, getEnv().JWT_REFRESH_SECRET);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(400, 'TOKEN_INVALID', 'This reset link is invalid or has expired');
    }

    const passwordHash = await hash(input.password, { type: argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit('AUTH_PASSWORD_RESET', record.userId, 'User', record.userId);
    return { reset: true };
  }

  private async issueSession(user: UserWithRoles, meta: RequestMeta): Promise<IssuedAuth> {
    const refreshToken = generateOpaqueToken();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken, getEnv().JWT_REFRESH_SECRET),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    const publicUser = this.toPublicUser(user);
    const accessToken = this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      roles: publicUser.roles,
      sid: session.id,
    });

    return {
      refreshToken,
      body: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        tokenType: 'Bearer',
        user: publicUser,
      },
    };
  }

  private channelAuth(issued: IssuedAuth, channel: 'web' | 'mobile'): IssuedAuth {
    if (channel === 'web') {
      const { refreshToken: _refreshToken, ...body } = issued.body;
      return { refreshToken: issued.refreshToken, body };
    }
    return issued;
  }

  private async issueEmailVerification(userId: string, email: string): Promise<string> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
    const raw = generateOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw, getEnv().JWT_REFRESH_SECRET),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000),
      },
    });
    const verificationUrl = `${getEnv().WEB_ORIGIN}/verify-email?token=${encodeURIComponent(raw)}`;
    this.logDevLink(`Email verification for ${email}`, verificationUrl);
    return verificationUrl;
  }

  private toPublicUser(user: UserWithRoles): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      locale: parseAppLocale(user.locale),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      roles: user.roles.map((assignment) => assignment.role.code as AuthenticatedRole),
    };
  }

  private async dummyHash(): Promise<string> {
    this.dummyPasswordHash ??= await hash('not-a-real-user-password', { type: argon2id });
    return this.dummyPasswordHash;
  }

  private includeDevLinks(): boolean {
    return getEnv().NODE_ENV !== 'production';
  }

  private logDevLink(label: string, url: string): void {
    if (this.includeDevLinks()) {
      this.logger.log(`${label}: ${url}`);
    }
  }

  private async audit(action: string, actorId: string, entityType: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType, entityId },
    });
  }
}
