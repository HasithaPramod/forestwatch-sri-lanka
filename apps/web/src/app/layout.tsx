import type { Metadata } from 'next';
import { Fraunces, Noto_Sans_Sinhala, Noto_Sans_Tamil, Outfit } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { messages } from '@/content/messages';
import { AuthProvider } from '@/lib/auth-context';
import { HtmlLang, I18nProvider } from '@/lib/i18n-context';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const sinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '600', '700'],
  variable: '--font-sinhala',
});

const tamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '600', '700'],
  variable: '--font-tamil',
});

export const metadata: Metadata = {
  title: {
    default: messages.siteName,
    template: `%s · ${messages.siteName}`,
  },
  description: messages.intro,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${sans.variable} ${sinhala.variable} ${tamil.variable} font-sans min-h-screen bg-cream`}
      >
        <AuthProvider>
          <I18nProvider>
            <HtmlLang />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
