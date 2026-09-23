import { describe, expect, it } from 'vitest';
import { buildPaginationMeta } from './pagination';
import { slugify } from './slug';
import { assertSafeStorageKey } from './storage-key';

describe('buildPaginationMeta', () => {
  it('caps limit and computes pages', () => {
    const meta = buildPaginationMeta({ page: 2, limit: 500, total: 45 });
    expect(meta.limit).toBe(100);
    expect(meta.totalPages).toBe(1);
    expect(meta.page).toBe(2);
  });
});

describe('slugify', () => {
  it('normalizes campaign names', () => {
    expect(slugify(' Bundala Restoration 04 ')).toBe('bundala-restoration-04');
  });
});

describe('assertSafeStorageKey', () => {
  it('rejects path traversal', () => {
    expect(() => assertSafeStorageKey('../secret')).toThrow();
    expect(() => assertSafeStorageKey('monitoring/photo.webp')).not.toThrow();
  });
});
