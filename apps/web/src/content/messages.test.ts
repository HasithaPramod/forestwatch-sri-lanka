import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, t } from '@forestwatch/i18n';
import { messages } from './messages';

describe('public copy', () => {
  it('uses the specified hero line', () => {
    expect(messages.tagline).toBe('Plant Today. Protect Tomorrow.');
    expect(t('en', 'home.tagline')).toBe('Plant Today. Protect Tomorrow.');
  });

  it('exposes the public navigation routes', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/map',
      '/locations',
      '/search',
      '/campaigns',
      '/species',
      '/plantations',
      '/reports',
      '/notifications',
      '/review',
      '/forestquest',
      '/impact',
      '/dashboard',
      '/about',
    ]);
  });
});
