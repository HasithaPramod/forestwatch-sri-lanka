import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import Colors from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/lib/i18n-context';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{glyph}</Text>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('mobile.tabHome'),
          tabBarIcon: ({ color }) => <TabGlyph glyph="FW" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('mobile.tabMap'),
          tabBarIcon: ({ color }) => <TabGlyph glyph="MAP" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: t('mobile.tabNearby'),
          tabBarIcon: ({ color }) => <TabGlyph glyph="NEAR" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quest"
        options={{
          title: t('mobile.tabQuest'),
          tabBarIcon: ({ color }) => <TabGlyph glyph="Q" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('mobile.tabProfile'),
          tabBarIcon: ({ color }) => <TabGlyph glyph="ME" color={color} />,
        }}
      />
    </Tabs>
  );
}
