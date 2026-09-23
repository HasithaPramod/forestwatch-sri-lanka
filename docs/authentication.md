# Authentication

Server-side only. Clients never assert identity, role, or session state.

## Roles

```text
CITIZEN
VOLUNTEER
ORGANIZATION_MANAGER
FOREST_OFFICER
ADMIN
SUPER_ADMIN
```

`GUEST` means “no session”. It is not persisted.

Permissions are additive. Volunteer includes citizen capabilities. Super admin includes admin.

All checks run in NestJS (`JwtAuthGuard`, `RolesGuard`). The access-token `roles` claim is copied from the database at login/refresh; `/auth/me` reloads roles from Postgres.

## Tokens

- Access token: JWT (HS256), 15 minutes, claims `sub`, `email`, `roles`, `sid`
- Refresh token: opaque random value, HMAC-SHA256 hashed with `JWT_REFRESH_SECRET` in `sessions`, rotated on every refresh
- Web (`clientChannel: web`): httpOnly `forestwatch_refresh` cookie; refresh token is omitted from JSON
- Mobile (`clientChannel: mobile`): refresh token returned in JSON for SecureStore
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are required

## Password

Argon2id. Never stored in plaintext. Login, register, forgot-password, reset-password, and resend-verification are rate-limited per IP.

Flows: register (CITIZEN), email verification, login, logout, logout-all, forgot password, reset password.

Email is not sent until SMTP exists. In development and test, verification and reset URLs are returned in the JSON body and logged by the API. Production omits those URLs.

Login requires `emailVerifiedAt`. Seed users are already verified.

## Clients

Web uses `@forestwatch/api-client` with `credentials: 'include'`. It keeps the access token in memory/sessionStorage and refreshes from the cookie.

Mobile uses the same client with `credentials: 'omit'` and `clientChannel: mobile`. Access and refresh tokens are stored in Expo SecureStore (localStorage on Expo web). Refresh and logout send the refresh token in the JSON body. Neither client is trusted to assert identity.

## Officer geography

`officer_assignments` bind officers to province/district/DSD codes. Verification of a plantation outside assignment fails with `FORBIDDEN`.
