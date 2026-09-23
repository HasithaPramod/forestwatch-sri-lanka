import { APP_LOCALES } from '@forestwatch/types';
import { Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Muted } from '@/components/ui';
import { useI18n } from '@/lib/i18n-context';

export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();

  return (
    <View>
      <Muted>{t('locale.label')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {APP_LOCALES.map((code) => {
          const selected = locale === code;
          return (
            <Pressable
              key={code}
              onPress={() => void setLocale(code)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: selected ? '#16382c' : 'transparent',
                borderWidth: 1,
                borderColor: '#16382c',
              }}
            >
              <Text style={{ color: selected ? '#f3eee2' : '#16382c', fontWeight: '700' }}>{t(`locale.${code}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
