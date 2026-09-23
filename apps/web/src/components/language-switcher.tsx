'use client';

import { APP_LOCALES } from '@forestwatch/types';
import { useI18n } from '@/lib/i18n-context';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={t('locale.label')}>
      {APP_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`rounded-full px-2 py-1 text-xs ${
            locale === code ? 'bg-forest-800 text-cream' : 'border border-forest-800/20 text-forest-800'
          }`}
          onClick={() => void setLocale(code)}
        >
          {t(`locale.short.${code}`)}
        </button>
      ))}
    </div>
  );
}
