import type { NamedCount, PublicUser } from '@forestwatch/types';

export function isOfficerUser(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => role === 'FOREST_OFFICER' || role === 'ADMIN' || role === 'SUPER_ADMIN'));
}

export function isAdminUser(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN'));
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-LK').format(value);
}

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function hrefForSearch(kind: string, id: string): string {
  if (kind === 'plantation') {
    return `/plantations/${id}`;
  }
  if (kind === 'campaign') {
    return `/campaigns/${id}`;
  }
  if (kind === 'species') {
    return `/species/${id}`;
  }
  if (kind === 'district' || kind === 'dsd' || kind === 'gnd') {
    return `/locations`;
  }
  return '/plantations';
}

export function maxTrees(rows: NamedCount[]): number {
  return rows.reduce((max, row) => Math.max(max, row.trees), 0);
}
