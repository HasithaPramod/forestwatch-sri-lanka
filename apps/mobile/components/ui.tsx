import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }
  return <Text style={styles.error}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  ...rest
}: { label: string } & TextInputProps) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={scheme === 'dark' ? '#7d9b6a' : '#6b7280'}
        style={[styles.input, { color: Colors[scheme].text, borderColor: Colors[scheme].tint }]}
        {...rest}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const scheme = useColorScheme() ?? 'light';
  const primary = variant === 'primary';
  const style: ViewStyle = {
    backgroundColor: primary ? Colors[scheme].tint : 'transparent',
    borderColor: Colors[scheme].tint,
    opacity: disabled ? 0.55 : 1,
  };
  const textStyle: TextStyle = {
    color: primary ? Colors[scheme].background : Colors[scheme].tint,
  };

  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, style]}>
      <Text style={[styles.buttonLabel, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#1f4d3a" />
      <Muted>{label}</Muted>
    </View>
  );
}

export function Card({ children, inset }: { children: ReactNode; inset?: boolean }) {
  return <View style={[styles.card, inset ? styles.inset : null]}>{children}</View>;
}

export function Hero({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const canopy = scheme === 'dark' ? '#0c1f18' : '#16382c';
  return (
    <RNView style={[styles.hero, { backgroundColor: canopy }]}>
      <RNView pointerEvents="none" style={styles.heroArt}>
        <RNView style={[styles.hill, styles.hillBack]} />
        <RNView style={[styles.hill, styles.hillFront]} />
      </RNView>
      {eyebrow ? (
        <Text lightColor="#cfe0c4" darkColor="#cfe0c4" style={styles.heroEyebrow}>
          {eyebrow}
        </Text>
      ) : null}
      <Text lightColor="#f3eee2" darkColor="#f3eee2" style={styles.heroTitle}>
        {title}
      </Text>
      {children}
    </RNView>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <RNView style={styles.statGrid}>{children}</RNView>;
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.85,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  error: {
    fontSize: 14,
    color: '#9b1c1c',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  loading: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(31, 77, 58, 0.18)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  inset: {
    borderColor: 'rgba(31, 77, 58, 0.45)',
    borderLeftWidth: 4,
  },
  hero: {
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
    gap: 8,
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  heroArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  hill: {
    position: 'absolute',
    borderRadius: 999,
  },
  hillBack: {
    width: 168,
    height: 168,
    right: -28,
    bottom: -48,
    backgroundColor: '#1f4d3a',
  },
  hillFront: {
    width: 124,
    height: 124,
    right: 48,
    bottom: -56,
    backgroundColor: '#2f6f4e',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(31, 77, 58, 0.18)',
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
});
