import type { SearchHit } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Field, Heading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';

export default function SearchScreen() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || q.trim().length < 2) {
      setItems([]);
      return;
    }
    const handle = setTimeout(() => {
      void client
        .search({ q: q.trim(), limit: 30 })
        .then((page) => {
          setItems(page.items);
          setError(null);
        })
        .catch((caught: unknown) => {
          setItems([]);
          setError(errorMessage(caught, 'Could not search'));
        });
    }, 250);
    return () => clearTimeout(handle);
  }, [client, q, ready]);

  return (
    <Screen>
      <Heading>{t('search.title')}</Heading>
      <Muted>{t('mobile.searchIntro')}</Muted>
      <Field label={t('search.query')} value={q} onChangeText={setQ} autoCapitalize="none" />
      {q.trim().length > 0 && q.trim().length < 2 ? <Muted>{t('search.typeTwo')}</Muted> : null}
      {error ? <Muted>{error}</Muted> : null}
      {items.map((item) => (
        <Link
          key={`${item.kind}:${item.id}`}
          href={item.kind === 'plantation' ? `/plantation/${item.id}` : '/impact'}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a', marginTop: 12 }}>{item.title}</Text>
          <Muted>
            {item.kind}
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </Muted>
        </Link>
      ))}
    </Screen>
  );
}
