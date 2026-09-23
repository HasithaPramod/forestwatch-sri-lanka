export const SRI_LANKA_BBOX = '79.5,5.8,82.0,10.0';

export const SRI_LANKA_CENTER = {
  latitude: 7.87,
  longitude: 80.77,
  latitudeDelta: 4.4,
  longitudeDelta: 3.2,
};

const SRI_LANKA_LAT = { min: 5, max: 10.5 };
const SRI_LANKA_LNG = { min: 79, max: 82.5 };

export function isInSriLanka(latitude: number, longitude: number): boolean {
  return (
    latitude >= SRI_LANKA_LAT.min &&
    latitude <= SRI_LANKA_LAT.max &&
    longitude >= SRI_LANKA_LNG.min &&
    longitude <= SRI_LANKA_LNG.max
  );
}

export function bboxAround(latitude: number, longitude: number, delta = 0.35): string {
  const round = (value: number) => Number(value.toFixed(4));
  const west = round(longitude - delta);
  const south = round(latitude - delta);
  const east = round(longitude + delta);
  const north = round(latitude + delta);
  return `${west},${south},${east},${north}`;
}

export function regionAround(latitude: number, longitude: number, delta = 0.35) {
  return {
    latitude,
    longitude,
    latitudeDelta: delta * 2,
    longitudeDelta: delta * 2,
  };
}

export function mapBboxForFix(fix: { latitude: number; longitude: number } | null): string {
  if (!fix || !isInSriLanka(fix.latitude, fix.longitude)) {
    return SRI_LANKA_BBOX;
  }
  return bboxAround(fix.latitude, fix.longitude);
}

export function gpsFieldsForApi(fix: { latitude: number; longitude: number; accuracyMeters: number | null } | null): {
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
} {
  if (!fix || !isInSriLanka(fix.latitude, fix.longitude)) {
    return {};
  }
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    gpsAccuracyMeters: fix.accuracyMeters ?? undefined,
  };
}
