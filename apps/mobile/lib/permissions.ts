import { isAdmin, isOfficer } from '@forestwatch/auth';
import {
  REPORT_ADMIN_REOPEN_STATUS,
  REPORT_STATUS_TRANSITIONS,
  type PublicUser,
  type ReportStatus,
} from '@forestwatch/types';

export function canVerifyRecords(user: PublicUser | null | undefined): boolean {
  return Boolean(user && isOfficer(user.roles));
}

export function canReviewReports(user: PublicUser | null | undefined): boolean {
  return canVerifyRecords(user);
}

export function canListAllReports(user: PublicUser | null | undefined): boolean {
  return Boolean(user && isAdmin(user.roles));
}

export function defaultReportsScope(user: PublicUser | null | undefined): 'mine' | 'assigned' | 'all' {
  if (canListAllReports(user)) {
    return 'all';
  }
  if (canReviewReports(user)) {
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
