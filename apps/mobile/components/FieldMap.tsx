import type { MapPlantationMarker } from '@forestwatch/types';
import MapView, { Circle, Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { SRI_LANKA_CENTER, regionAround } from '@/lib/geo';

export function FieldMap({
  items,
  userFix,
  onSiteMeters,
  nearbyMeters,
  visitedIds,
  zoomDelta,
}: {
  items: MapPlantationMarker[];
  userFix: { latitude: number; longitude: number } | null;
  onSiteMeters?: number;
  nearbyMeters?: number;
  visitedIds?: Set<string>;
  zoomDelta?: number;
}) {
  const region = userFix ? regionAround(userFix.latitude, userFix.longitude, zoomDelta ?? 0.35) : SRI_LANKA_CENTER;
  const markers = items.flatMap((item) => {
    if (item.coordinates.latitude == null || item.coordinates.longitude == null) {
      return [];
    }
    return [
      {
        id: item.id,
        name: item.name,
        treeCount: item.treeCount,
        latitude: item.coordinates.latitude,
        longitude: item.coordinates.longitude,
        approximate: item.coordinates.precision === 'approximate',
        visited: visitedIds?.has(item.id) ?? false,
      },
    ];
  });

  return (
    <MapView style={styles.map} initialRegion={region} region={userFix ? region : undefined}>
      {userFix && nearbyMeters ? (
        <Circle
          center={userFix}
          radius={nearbyMeters}
          strokeColor="#7d9b6a"
          fillColor="rgba(47, 111, 78, 0.12)"
          strokeWidth={1}
        />
      ) : null}
      {userFix && onSiteMeters ? (
        <Circle
          center={userFix}
          radius={onSiteMeters}
          strokeColor="#cfe0c4"
          fillColor="rgba(207, 224, 196, 0.22)"
          strokeWidth={2}
        />
      ) : null}
      {userFix ? <Marker coordinate={userFix} title="Your GPS" pinColor="#b4532a" /> : null}
      {markers.map((item) => (
        <Marker
          key={item.id}
          coordinate={{ latitude: item.latitude, longitude: item.longitude }}
          title={item.name}
          description={`${item.treeCount} recorded trees`}
          pinColor={item.visited ? '#7d9b6a' : item.approximate ? '#b4532a' : '#1f4d3a'}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
