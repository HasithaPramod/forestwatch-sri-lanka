import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export function PhaseNotice({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>ForestWatch Sri Lanka</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
});
