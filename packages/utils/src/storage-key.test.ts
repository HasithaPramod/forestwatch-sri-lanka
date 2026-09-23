import { describe, expect, it } from 'vitest';
import { assertSafeStorageKey, thumbnailKeyFor } from './storage-key';

describe('storage keys', () => {
  it('rejects parent-path segments', () => {
    expect(() => assertSafeStorageKey('../escape.webp')).toThrow();
  });

  it('derives a sibling thumbnail key', () => {
    expect(thumbnailKeyFor('plantations/abc/photo.webp')).toBe('plantations/abc/photo-thumb.webp');
  });
});
