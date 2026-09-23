import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, hashToken, tokenHashesMatch } from './tokens';

describe('opaque tokens', () => {
  it('hashes with the refresh secret so a leaked digest is not reusable', () => {
    const raw = generateOpaqueToken();
    const digest = hashToken(raw, 'refresh-secret');
    expect(digest).not.toBe(raw);
    expect(digest).not.toBe(hashToken(raw, 'other-secret'));
    expect(tokenHashesMatch(digest, hashToken(raw, 'refresh-secret'))).toBe(true);
  });
});
