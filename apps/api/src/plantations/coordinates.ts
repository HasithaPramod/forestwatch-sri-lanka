import { isAdmin, isOfficer } from '@forestwatch/auth';
import { Prisma } from '@forestwatch/database';
import type { CoordinatePrecision, LocationVisibility, PlantationCoordinates } from '@forestwatch/types';
import type { RequestUser } from '../auth/types';

const APPROXIMATE_DECIMALS = 3;

function canSeeExactCoordinates(
  user: RequestUser | undefined,
  plantation: { createdById: string; organization?: { createdById: string } | null },
): boolean {
  if (!user) {
    return false;
  }
  if (isOfficer(user.roles) || isAdmin(user.roles)) {
    return true;
  }
  return plantation.createdById === user.id || plantation.organization?.createdById === user.id;
}

function roundCoord(value: number): number {
  const factor = 10 ** APPROXIMATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

function toNumber(value: Prisma.Decimal | number | string | null): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return value.toNumber();
}

export function serializeCoordinates(
  plantation: {
    latitude: Prisma.Decimal | number | string | null;
    longitude: Prisma.Decimal | number | string | null;
    locationVisibility: LocationVisibility | string;
    createdById: string;
    organization?: { createdById: string } | null;
  },
  user?: RequestUser,
): PlantationCoordinates {
  const exact = canSeeExactCoordinates(user, plantation);
  const latitude = toNumber(plantation.latitude);
  const longitude = toNumber(plantation.longitude);

  if (exact || plantation.locationVisibility === 'PUBLIC_EXACT') {
    return { latitude, longitude, precision: 'exact' };
  }

  if (plantation.locationVisibility === 'OFFICER_ONLY') {
    return { latitude: null, longitude: null, precision: 'hidden' };
  }

  return {
    latitude: latitude == null ? null : roundCoord(latitude),
    longitude: longitude == null ? null : roundCoord(longitude),
    precision: 'approximate' satisfies CoordinatePrecision,
  };
}
