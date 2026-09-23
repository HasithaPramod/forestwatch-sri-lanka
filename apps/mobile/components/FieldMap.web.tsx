import type { MapPlantationMarker } from '@forestwatch/types';
import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { formatCoordinates } from '@/lib/format';

export function FieldMap({
  items,
  userFix,
  onSiteMeters,
  nearbyMeters,
}: {
  items: MapPlantationMarker[];
  userFix: { latitude: number; longitude: number } | null;
  onSiteMeters?: number;
  nearbyMeters?: number;
  visitedIds?: Set<string>;
  zoomDelta?: number;
}) {
  const plotted = items.filter(
    (item) => item.coordinates.latitude != null && item.coordinates.longitude != null,
  );

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.body}>
        Native maps are used on Android and iOS. This web shell lists the same bbox markers from the API.
      </Text>
      {userFix ? (
        <Text style={styles.body}>
          Device GPS: {userFix.latitude.toFixed(4)}, {userFix.longitude.toFixed(4)}
          {onSiteMeters != null && nearbyMeters != null
            ? ` · on-site ${String(onSiteMeters)} m · nearby ${String(nearbyMeters)} m`
            : ''}
        </Text>
      ) : (
        <Text style={styles.body}>Device GPS is not available for this view.</Text>
      )}
      <Text style={styles.body}>{plotted.length} public markers with coordinates.</Text>
      {plotted.slice(0, 3).map((item) => (
        <Text key={item.id} style={styles.body}>
          {item.name}: {formatCoordinates(item.coordinates.latitude, item.coordinates.longitude, item.coordinates.precision)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: 'rgba(31, 77, 58, 0.18)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    minHeight: 160,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
  },
  body: {
    fontSize: 14,
    opacity: 0.75,
  },
});
