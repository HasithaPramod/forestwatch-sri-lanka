/** Display bands from NestJS distance. Must match GEO_PROXIMITY_METERS. */
export const FIELD_ON_SITE_METERS = 100;
export const FIELD_NEARBY_METERS = 500;

export type FieldProximityBand = 'ON_SITE' | 'NEARBY' | 'REMOTE';

export function fieldProximityBand(distanceMeters: number): FieldProximityBand {
  if (distanceMeters <= FIELD_ON_SITE_METERS) {
    return 'ON_SITE';
  }
  if (distanceMeters <= FIELD_NEARBY_METERS) {
    return 'NEARBY';
  }
  return 'REMOTE';
}
