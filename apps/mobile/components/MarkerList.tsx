import type { MapPlantationMarker } from '@forestwatch/types';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { formatCoordinates, formatRecordedTrees } from '@/lib/format';

export function MarkerList({ items }: { items: MapPlantationMarker[] }) {
  if (items.length === 0) {
    return <Text style={styles.empty}>No public plantation markers in this area.</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Link key={item.id} href={`/plantation/${item.id}`}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {formatRecordedTrees(item.treeCount)} · {item.verificationStatus}
            </Text>
            <Text style={styles.meta}>
              {formatCoordinates(item.coordinates.latitude, item.coordinates.longitude, item.coordinates.precision)}
            </Text>
          </View>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderColor: 'rgba(31, 77, 58, 0.18)',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    opacity: 0.7,
  },
  empty: {
    fontSize: 14,
    opacity: 0.7,
  },
});
