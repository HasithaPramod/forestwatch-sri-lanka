import type { PublicUser } from '@forestwatch/types';

const CAMPAIGN_MANAGERS = new Set(['ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

export function canManageCampaigns(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => CAMPAIGN_MANAGERS.has(role)));
}

export function formatCampaignDate(value: string | null): string {
  if (!value) {
    return 'Open-ended';
  }
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

export function formatTargetTrees(value: number | null): string | null {
  if (value == null) {
    return null;
  }
  return `${value.toLocaleString('en-LK')} trees (target)`;
}

export function formatTargetArea(value: number | null): string | null {
  if (value == null) {
    return null;
  }
  return `${value.toLocaleString('en-LK')} ha (target)`;
}
