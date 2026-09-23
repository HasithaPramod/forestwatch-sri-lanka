import type { PublicUser, VerificationDecision } from '@forestwatch/types';

const DECISION_LABELS: Record<VerificationDecision, string> = {
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  REQUEST_CORRECTION: 'Correction requested',
};

export function formatVerificationDecision(decision: VerificationDecision): string {
  return DECISION_LABELS[decision];
}

export function canVerifyRecords(user: PublicUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => role === 'FOREST_OFFICER' || role === 'ADMIN' || role === 'SUPER_ADMIN'));
}
