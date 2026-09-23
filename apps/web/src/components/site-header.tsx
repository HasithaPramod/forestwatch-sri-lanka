'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ACCOUNT_NAV_ITEMS, NAV_ITEMS } from '@forestwatch/i18n';
import { AuthNav } from '@/components/auth-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export function SiteHeader() {
  const { t } = useI18n();
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = user ? [...NAV_ITEMS, ...ACCOUNT_NAV_ITEMS] : [...NAV_ITEMS];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-forest-900/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 font-display text-base tracking-tight text-forest-800 sm:text-lg">
          {t('site.name')}
        </Link>
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center justify-center gap-4 text-sm md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href ? 'font-semibold text-forest-800' : 'text-ink/75 hover:text-forest-700'
              }
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <div className="hidden md:block">
            <AuthNav />
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-800/30 text-forest-800 md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">{open ? t('nav.closeMenu') : t('nav.openMenu')}</span>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="site-menu" aria-label={t('nav.menu')} className="border-t border-forest-900/10 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-2 py-2 text-sm text-ink/90 hover:bg-white hover:text-forest-800"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="mt-2 border-t border-forest-900/10 pt-3">
              <AuthNav stacked />
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
