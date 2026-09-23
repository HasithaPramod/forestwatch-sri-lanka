import type { CoordinatePrecision, PublicUser } from '@forestwatch/types';

export function canSubmitPlantations(user: PublicUser | null | undefined): boolean {
  return Boolean(user);
}

export function formatRecordedTrees(count: number): string {
  return `${count.toLocaleString('en-LK')} recorded trees`;
}

export function formatCoordinates(
  latitude: number | null,
  longitude: number | null,
  precision: CoordinatePrecision,
): string {
  if (precision === 'hidden' || latitude == null || longitude == null) {
    return 'Coordinates withheld';
  }
  const suffix = precision === 'approximate' ? ' (approximate)' : '';
  return `${latitude.toFixed(precision === 'approximate' ? 3 : 4)}, ${longitude.toFixed(precision === 'approximate' ? 3 : 4)}${suffix}`;
}
