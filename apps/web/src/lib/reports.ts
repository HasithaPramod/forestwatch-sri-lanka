import {
  REPORT_CATEGORIES,
  REPORT_STATUS_TRANSITIONS,
  REPORT_ADMIN_REOPEN_STATUS,
  type PublicUser,
  type ReportCategory,
  type ReportStatus,
} from '@forestwatch/types';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  DEAD_TREES: 'Dead trees',
  DAMAGED_TREES: 'Damaged trees',
  FIRE_DAMAGE: 'Fire damage',
  ILLEGAL_CUTTING: 'Illegal cutting',
  MISSING_TREES: 'Missing trees',
  WATER_SHORTAGE: 'Water shortage',
  PEST_DISEASE: 'Pest or disease',
  INCORRECT_INFORMATION: 'Incorrect information',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  ACTION_REQUIRED: 'Action required',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const REPORT_CATEGORY_OPTIONS = REPORT_CATEGORIES as readonly ReportCategory[];

export function formatReportCategory(category: ReportCategory): string {
  return CATEGORY_LABELS[category];
}

export function formatReportStatus(status: ReportStatus): string {
  return STATUS_LABELS[status];
}

export function canReviewReports(user: PublicUser | null | undefined): boolean {
  return Boolean(
    user?.roles.some((role) => role === 'FOREST_OFFICER' || role === 'ADMIN' || role === 'SUPER_ADMIN'),
  );
}

export function canListAssignedReports(user: PublicUser | null | undefined): boolean {
  return canReviewReports(user);
}

export function canListAllReports(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN'));
}

export function defaultReportsScope(user: PublicUser | null | undefined): 'mine' | 'assigned' | 'all' {
  if (canListAllReports(user)) {
    return 'all';
  }
  if (canListAssignedReports(user)) {
    return 'assigned';
  }
  return 'mine';
}

export function nextReportStatuses(status: ReportStatus, admin: boolean): ReportStatus[] {
  const next = [...REPORT_STATUS_TRANSITIONS[status]];
  if (admin && (status === 'RESOLVED' || status === 'REJECTED')) {
    next.push(REPORT_ADMIN_REOPEN_STATUS);
  }
  return next;
}
