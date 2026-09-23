export function resolvePublicApiUrl(envUrl?: string, hostUri?: string, os = 'web'): string {
  const explicit = envUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const host = hostUri?.split(':')[0];
  if (host && os !== 'web') {
    return `http://${host}:3001/api/v1`;
  }

  if (os === 'android') {
    return 'http://10.0.2.2:3001/api/v1';
  }

  return 'http://localhost:3001/api/v1';
}
