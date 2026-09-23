const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/;

const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+(?:-[a-z0-9]+)*\.vercel\.app$/i;

export function parseWebOrigins(webOrigin: string): string[] {
  return webOrigin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  options: { webOrigin: string; nodeEnv: string; vercel?: boolean },
): boolean {
  if (!origin) {
    return true;
  }

  if (parseWebOrigins(options.webOrigin).includes(origin)) {
    return true;
  }

  if (options.nodeEnv !== 'production') {
    return LAN_ORIGIN.test(origin);
  }

  return Boolean(options.vercel && VERCEL_PREVIEW_ORIGIN.test(origin));
}
