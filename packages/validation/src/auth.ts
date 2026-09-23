import { APP_LOCALES, AUTHENTICATED_ROLES, type AppLocale, type AuthenticatedRole } from '@forestwatch/types';
import { z } from 'zod';

export const localeSchema = z.enum(APP_LOCALES as unknown as [AppLocale, ...AppLocale[]]);

const roleCodeSchema = z.enum(AUTHENTICATED_ROLES as unknown as [AuthenticatedRole, ...AuthenticatedRole[]]);

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+$/, 'Invalid email');

export const displayNameSchema = z.string().trim().min(2).max(80);

export const clientChannelSchema = z.enum(['web', 'mobile']).default('mobile');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  locale: localeSchema.default('en'),
});

export const updateMeBodySchema = z
  .object({
    locale: localeSchema,
  })
  .strict();

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  clientChannel: clientChannelSchema,
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
  clientChannel: clientChannelSchema,
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
  clientChannel: clientChannelSchema,
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const verifyEmailBodySchema = z.object({
  token: z.string().min(20),
});

export const resendVerificationBodySchema = z.object({
  email: emailSchema,
});

export const accessTokenClaimsSchema = z.object({
  sub: z.string().uuid(),
  email: emailSchema,
  roles: z.array(roleCodeSchema),
  sid: z.string().uuid(),
});

export type RegisterBody = z.input<typeof registerBodySchema>;
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type LoginBody = z.input<typeof loginBodySchema>;
export type RefreshBody = z.input<typeof refreshBodySchema>;
export type LogoutBody = z.input<typeof logoutBodySchema>;
export type ForgotPasswordBody = z.input<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.input<typeof resetPasswordBodySchema>;
export type VerifyEmailBody = z.input<typeof verifyEmailBodySchema>;
export type ResendVerificationBody = z.input<typeof resendVerificationBodySchema>;
