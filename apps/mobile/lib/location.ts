import * as Location from 'expo-location';

export type DeviceFix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

export async function requestDeviceFix(): Promise<DeviceFix | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? null,
  };
}
