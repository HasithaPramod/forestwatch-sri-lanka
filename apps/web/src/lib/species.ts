import type { PublicUser } from '@forestwatch/types';

const SPECIES_MANAGERS = new Set(['ADMIN', 'SUPER_ADMIN']);

export function canManageSpecies(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => SPECIES_MANAGERS.has(role)));
}

export function speciesPath(scientificName: string): string {
  return `/species/${encodeURIComponent(scientificName.trim().toLowerCase().replace(/\s+/g, '-'))}`;
}

export function formatPlantationRecords(count: number): string {
  return `Listed on ${count} plantation record${count === 1 ? '' : 's'}`;
}
