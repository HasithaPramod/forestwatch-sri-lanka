import { describe, expect, it } from 'vitest';
import { APP_LOCALES } from '@forestwatch/types';
import { catalogueName, dictionaries, flattenMessageKeys, t } from './index';

describe('i18n dictionaries', () => {
  it('keeps Sinhala and Tamil key trees aligned with English', () => {
    const english = flattenMessageKeys(dictionaries.en).sort();
    expect(flattenMessageKeys(dictionaries.si).sort()).toEqual(english);
    expect(flattenMessageKeys(dictionaries.ta).sort()).toEqual(english);
    expect(APP_LOCALES).toEqual(['en', 'si', 'ta']);
  });

  it('uses the specified English hero line', () => {
    expect(t('en', 'home.tagline')).toBe('Plant Today. Protect Tomorrow.');
  });

  it('falls back to English then the key', () => {
    expect(t('si', 'home.tagline')).toContain('රෝපණය');
    expect(t('xx', 'home.tagline')).toBe('Plant Today. Protect Tomorrow.');
    expect(t('en', 'missing.key')).toBe('missing.key');
  });

  it('interpolates placeholders', () => {
    expect(t('en', 'search.results', { count: 3 })).toBe('3 results');
  });

  it('uses catalogue names from data fields rather than invented translations', () => {
    expect(
      catalogueName('si', { en: 'Hambantota', si: 'හම්බන්තොට', ta: 'ஹம்பாந்தோட்டை' }),
    ).toBe('හම්බන්තොට');
    expect(catalogueName('ta', { en: 'Teak', si: '', ta: 'தேக்கு' })).toBe('தேக்கு');
  });
});
