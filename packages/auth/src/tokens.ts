import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('hex');
}

export function tokenHashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
