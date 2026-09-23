import { describe, expect, it } from 'vitest';
import { hrefForSearch } from './dashboards';

describe('dashboard helpers', () => {
  it('routes search hits to existing pages without inventing a generic AI dashboard', () => {
    expect(hrefForSearch('plantation', 'ba6f6ef0-90fe-4d9c-8376-568a218c9d93')).toBe(
      '/plantations/ba6f6ef0-90fe-4d9c-8376-568a218c9d93',
    );
    expect(hrefForSearch('campaign', 'bundala-restoration-2026')).toBe('/campaigns/bundala-restoration-2026');
    expect(hrefForSearch('district', 'LK-33')).toBe('/locations');
  });
});
